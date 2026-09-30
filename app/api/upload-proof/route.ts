import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const transactionId = (formData.get('transaction_id') as string) || ''
    const orderId = (formData.get('order_id') as string) || ''

    if (!file) {
      return NextResponse.json(
        { message: 'File bukti pembayaran wajib diunggah.' },
        { status: 400 }
      )
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/jpg']
    if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'Format file tidak didukung. Harap unggah gambar (JPG, PNG, atau WEBP).' },
        { status: 400 }
      )
    }

    // Limit 8MB
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Ukuran file terlalu besar. Maksimal 8MB.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop() || 'jpg'
    const safeTx = (transactionId || 'order').replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${safeTx}_${Date.now()}.${ext}`

    const supabase = createServiceClient()
    let proofUrl = ''

    // Attempt 1: Upload to Supabase Storage bucket 'payment_proofs'
    try {
      // Ensure bucket exists or create it
      const { data: bucket } = await supabase.storage.getBucket('payment_proofs')
      if (!bucket) {
        await supabase.storage.createBucket('payment_proofs', {
          public: true,
          fileSizeLimit: 8388608,
        })
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('payment_proofs')
          .getPublicUrl(fileName)
        proofUrl = publicUrlData.publicUrl
      } else {
        console.warn('[upload-proof] Storage upload failed, falling back to data URL:', uploadError)
      }
    } catch (err) {
      console.warn('[upload-proof] Storage bucket error, falling back to data URL:', err)
    }

    // Attempt 2: Fallback to base64 Data URL if storage is unavailable
    if (!proofUrl) {
      const mime = file.type || 'image/jpeg'
      proofUrl = `data:${mime};base64,${buffer.toString('base64')}`
    }

    // Update order in Supabase if transactionId or orderId is provided
    if (transactionId || orderId) {
      try {
        const query = supabase.from('orders').update({
          payment_proof_url: proofUrl,
          payment_status: 'verification',
          updated_at: new Date().toISOString(),
        })

        if (orderId) {
          query.eq('id', orderId)
        } else {
          query.eq('transaction_id', transactionId)
        }

        const { error: updateError } = await query

        if (updateError && updateError.message?.includes('payment_proof_url')) {
          console.warn('[upload-proof] payment_proof_url column not found in database. Please run migration.')
        }

        // Add audit trail event
        if (orderId || transactionId) {
          let resolvedOrderId = orderId
          if (!resolvedOrderId && transactionId) {
            const { data: ord } = await supabase
              .from('orders')
              .select('id')
              .eq('transaction_id', transactionId)
              .maybeSingle()
            if (ord) resolvedOrderId = ord.id
          }

          if (resolvedOrderId) {
            await supabase.from('order_events').insert({
              order_id: resolvedOrderId,
              event_type: 'PAYMENT_PROOF_UPLOADED',
              description: 'Bukti pembayaran (transfer/QRIS) diunggah oleh wali/santri',
              metadata: { proof_url: proofUrl.startsWith('data:') ? 'base64_embedded' : proofUrl },
            })
          }
        }
      } catch (dbErr) {
        console.warn('[upload-proof] Error updating order record:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah.',
      proof_url: proofUrl,
    })
  } catch (error) {
    console.error('[upload-proof] Unexpected error:', error)
    return NextResponse.json(
      { message: 'Gagal memproses unggahan bukti pembayaran.' },
      { status: 500 }
    )
  }
}

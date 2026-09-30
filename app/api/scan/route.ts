import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decodeQrToken, verifyQrSignature } from '@/lib/qr-verifier'
import { createHash } from 'crypto'
import { z } from 'zod'

const scanSchema = z.object({
  code: z.string().min(1, 'Kode scan tidak boleh kosong'),
  targetStatus: z.enum(['received', 'processing', 'ready']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabaseUserClient = await createClient()
    const { data: { user } } = await supabaseUserClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 })
    }

    // 2. Parse input
    const body = await request.json()
    const parsed = scanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Parameter scan tidak valid.' }, { status: 400 })
    }

    const rawCode = parsed.data.code.trim()
    const targetStatus = parsed.data.targetStatus || 'received'

    let transactionId: string | null = null
    let decodedTokenPayload: ReturnType<typeof decodeQrToken> = null
    let extractedToken: string | null = null

    // 3. Resolve QR Code content (URL / Token / Transaction ID)
    if (rawCode.includes('/c/')) {
      const parts = rawCode.split('/c/')
      extractedToken = parts[parts.length - 1].split('?')[0].split('#')[0]
      decodedTokenPayload = decodeQrToken(extractedToken)
      if (decodedTokenPayload?.id) {
        transactionId = decodedTokenPayload.id
      }
    } else if (rawCode.includes('/track/')) {
      const parts = rawCode.split('/track/')
      const idPart = parts[parts.length - 1].split('?')[0].split('#')[0]
      transactionId = decodeURIComponent(idPart)
    } else {
      // Check if rawCode itself is a base64 token
      decodedTokenPayload = decodeQrToken(rawCode)
      if (decodedTokenPayload?.id) {
        extractedToken = rawCode
        transactionId = decodedTokenPayload.id
      } else {
        // Regex match standard LW-... transaction ID
        const match = rawCode.match(/(LW-[A-Za-z0-9\-]+)/i)
        if (match) {
          transactionId = match[1].toUpperCase()
        } else {
          transactionId = rawCode
        }
      }
    }

    if (!transactionId) {
      return NextResponse.json({ message: 'Kode QR tidak dapat dikenali.' }, { status: 400 })
    }

    const service = createServiceClient()

    // 4. Query order in Supabase
    let { data: order } = await service
      .from('orders')
      .select('*')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    // 5. If order doesn't exist yet, but we have valid signed QR token: auto-create order!
    if (!order && decodedTokenPayload && extractedToken) {
      const isValid = await verifyQrSignature(decodedTokenPayload)
      if (isValid) {
        const tokenHash = createHash('sha256').update(extractedToken).digest('hex')
        const newOrderData: Record<string, any> = {
          transaction_id: decodedTokenPayload.id,
          intake_token_hash: tokenHash,
          customer_name: decodedTokenPayload.wali,
          student_name: decodedTokenPayload.santri,
          customer_phone: decodedTokenPayload.hp || null,
          weight: decodedTokenPayload.kg,
          unit_price: decodedTokenPayload.harga,
          total_amount: decodedTokenPayload.total,
          payment_method: decodedTokenPayload.bayar || 'cash',
          payment_status: decodedTokenPayload.lunas ? 'paid' : 'pending',
          status: targetStatus,
          submitted_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
        }

        if (decodedTokenPayload.nis) newOrderData.student_reg_number = decodedTokenPayload.nis
        if (decodedTokenPayload.layanan) newOrderData.service_type = decodedTokenPayload.layanan
        if (targetStatus === 'processing') newOrderData.processing_at = new Date().toISOString()

        const { data: createdOrder, error: createError } = await service
          .from('orders')
          .insert(newOrderData)
          .select('*')
          .single()

        if (!createError && createdOrder) {
          order = createdOrder

          await service.from('order_events').insert({
            order_id: order.id,
            event_type: 'STAFF_INTAKE_AUTO_REGISTERED',
            actor_id: user.id,
            description: `Pesanan di-intake dan didaftarkan otomatis oleh staf ${user.email} via Scan QR`,
            metadata: { transaction_id: transactionId, status: targetStatus },
          })
        }
      }
    }

    if (!order) {
      return NextResponse.json({
        message: `Pesanan dengan No. Transaksi "${transactionId}" belum terdaftar di sistem online. Pastikan nota sudah pernah dicetak di stand.`,
      }, { status: 404 })
    }

    // 6. Update order status
    const previousStatus = order.status
    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updated_at: nowIso,
    }

    if (targetStatus === 'received' && !order.received_at) {
      updatePayload.received_at = nowIso
    }
    if (targetStatus === 'processing' && !order.processing_at) {
      updatePayload.processing_at = nowIso
      if (!order.received_at) updatePayload.received_at = nowIso
    }
    if (targetStatus === 'ready' && !order.completed_at) {
      updatePayload.completed_at = nowIso
    }

    const { data: updatedOrder, error: updateError } = await service
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateError || !updatedOrder) {
      return NextResponse.json({ message: 'Gagal memperbarui status cucian.' }, { status: 500 })
    }

    // 7. Audit log event
    const statusLabels: Record<string, string> = {
      received: 'Diterima di Ruang Laundry (Masuk Antrean Cuci)',
      processing: 'Mulai Diproses / Dicuci',
      ready: 'Selesai Dicuci & Disetrika (Siap Diambil)',
    }

    await service.from('order_events').insert({
      order_id: order.id,
      event_type: 'STAFF_QR_SCAN_INTAKE',
      actor_id: user.id,
      description: `Buntelan di-scan oleh staf ${user.email}: ${statusLabels[targetStatus] || targetStatus}`,
      metadata: {
        from_status: previousStatus,
        to_status: targetStatus,
        scanned_code: rawCode.length > 50 ? rawCode.slice(0, 50) + '...' : rawCode,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Buntelan santri ${updatedOrder.student_name} (${updatedOrder.weight} kg) berhasil di-absen: ${statusLabels[targetStatus] || targetStatus}`,
      action_desc: statusLabels[targetStatus] || targetStatus,
      previous_status: previousStatus,
      new_status: targetStatus,
      order: {
        id: updatedOrder.id,
        transaction_id: updatedOrder.transaction_id,
        student_name: updatedOrder.student_name,
        customer_name: updatedOrder.customer_name,
        student_reg_number: updatedOrder.student_reg_number,
        service_type: updatedOrder.service_type,
        weight: updatedOrder.weight,
        total_amount: updatedOrder.total_amount,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
      },
    }, { status: 200 })

  } catch (err: any) {
    console.error('[scan api] Error:', err)
    return NextResponse.json({ message: 'Terjadi kesalahan server saat memproses scan.' }, { status: 500 })
  }
}

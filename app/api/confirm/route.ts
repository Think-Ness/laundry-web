import { NextRequest, NextResponse } from 'next/server'
import { decodeQrToken, verifyQrSignature } from '@/lib/qr-verifier'
import { createServiceClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(10),
  note: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  // Rate limiting (basic: check IP from headers)
  // For production, use Upstash Redis or Vercel Edge Config

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Data tidak valid.' },
        { status: 400 }
      )
    }

    const { token, note } = parsed.data

    // 1. Decode payload
    const payload = decodeQrToken(token)
    if (!payload) {
      return NextResponse.json(
        { message: 'Token QR tidak valid.' },
        { status: 400 }
      )
    }

    // 2. Verify HMAC signature (server-side)
    const isValid = await verifyQrSignature(payload)
    if (!isValid) {
      return NextResponse.json(
        { message: 'Tanda tangan QR tidak valid. Kemungkinan token telah dimanipulasi.' },
        { status: 403 }
      )
    }

    // 3. Hash the token to use as idempotency key (never store raw token)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // 4. Use service role for controlled insert (bypasses RLS for this trusted operation)
    const supabase = createServiceClient()

    // 5. Idempotency check: if order with this token hash already exists, return 409
    const { data: existing } = await supabase
      .from('orders')
      .select('id, transaction_id, status')
      .eq('intake_token_hash', tokenHash)
      .single()

    if (existing) {
      return NextResponse.json(
        { message: 'Sudah dikirim sebelumnya.', order_id: existing.id },
        { status: 409 }
      )
    }

    // 6. Create new order in Supabase
    const orderData: Record<string, any> = {
      transaction_id:   payload.id,
      intake_token_hash: tokenHash,
      customer_name:    payload.wali,
      student_name:     payload.santri,
      customer_phone:   payload.hp || null,
      weight:           payload.kg,
      unit_price:       payload.harga,
      total_amount:     payload.total,
      payment_method:   payload.bayar,
      payment_status:   payload.lunas ? 'paid' : 'pending',
      customer_note:    note || null,
      status:           'new',
      submitted_at:     new Date().toISOString(),
    }

    if (payload.nis) {
      orderData.student_reg_number = payload.nis
    }
    if (payload.layanan) {
      orderData.service_type = payload.layanan
    }

    let { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single()

    // Graceful fallback if columns don't exist yet on remote Supabase
    if (error && (error.message?.includes('student_reg_number') || error.message?.includes('service_type'))) {
      delete orderData.student_reg_number
      delete orderData.service_type
      const retry = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single()
      order = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[confirm] Supabase insert error:', error)

      // Handle unique constraint violation (race condition duplicate)
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Sudah dikirim sebelumnya.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { message: 'Gagal menyimpan pesanan. Coba lagi.' },
        { status: 500 }
      )
    }

    // 7. Log event
    await supabase.from('order_events').insert({
      order_id:    order.id,
      event_type:  'CUSTOMER_SUBMITTED',
      description: `Wali santri ${payload.wali} mengirim konfirmasi laundry via QR`,
      metadata:    { transaction_id: payload.id, customer_note: note },
    })

    return NextResponse.json(
      { message: 'Berhasil dikirim.', order_id: order.id },
      { status: 200 }
    )

  } catch (err) {
    console.error('[confirm] Unexpected error:', err)
    return NextResponse.json(
      { message: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}

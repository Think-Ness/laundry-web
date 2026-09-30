import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { STATUS_TRANSITIONS, type OrderStatus } from '@/types'
import { z } from 'zod'

const schema = z.object({
  status: z.enum([
    'waiting_confirmation', 'new', 'received', 'processing', 'ready', 'completed', 'cancelled'
  ]),
})

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Validate body
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Status tidak valid.' }, { status: 400 })
  }

  const { status: newStatus } = parsed.data

  // Get current order
  const service = createServiceClient()
  const { data: order, error: fetchError } = await service
    .from('orders')
    .select('id, status, transaction_id')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ message: 'Pesanan tidak ditemukan.' }, { status: 404 })
  }

  // Validate transition
  const allowed = STATUS_TRANSITIONS[order.status as OrderStatus] ?? []
  if (!allowed.includes(newStatus as OrderStatus)) {
    return NextResponse.json(
      { message: `Tidak dapat mengubah status dari "${order.status}" ke "${newStatus}".` },
      { status: 422 }
    )
  }

  // Build timestamp updates
  const tsField: Record<OrderStatus, string | null> = {
    waiting_confirmation: null,
    new: null,
    received: 'received_at',
    processing: 'processing_at',
    ready: null,
    completed: 'completed_at',
    cancelled: null,
  }

  const updateData: Record<string, string> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  const tsKey = tsField[newStatus as OrderStatus]
  if (tsKey) updateData[tsKey] = new Date().toISOString()

  // Update order
  const { error: updateError } = await service
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ message: 'Gagal memperbarui status.' }, { status: 500 })
  }

  // Log audit event
  const eventDescriptions: Record<OrderStatus, string> = {
    waiting_confirmation: 'Menunggu konfirmasi wali',
    new: 'Pesanan baru diterima dari wali santri',
    received: `Pesanan diterima oleh staf laundry`,
    processing: `Pesanan mulai diproses (cuci/setrika)`,
    ready: `Pesanan selesai diproses, siap diambil`,
    completed: `Pesanan selesai dan sudah diambil`,
    cancelled: `Pesanan dibatalkan`,
  }

  await service.from('order_events').insert({
    order_id:    id,
    event_type:  `ORDER_${newStatus.toUpperCase()}`,
    actor_id:    user.id,
    description: eventDescriptions[newStatus as OrderStatus] ?? `Status diubah ke ${newStatus}`,
    metadata:    { from_status: order.status, to_status: newStatus, actor_email: user.email },
  })

  return NextResponse.json({ message: 'Status berhasil diperbarui.', status: newStatus }, { status: 200 })
}

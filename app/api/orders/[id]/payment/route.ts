import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  payment_status: z.enum(['paid', 'pending', 'verification']),
  payment_method: z.enum(['cash', 'qris', 'transfer']).optional(),
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

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Data pembayaran tidak valid.' }, { status: 400 })
  }

  const { payment_status, payment_method } = parsed.data
  const service = createServiceClient()

  const updateData: Record<string, any> = {
    payment_status,
    updated_at: new Date().toISOString(),
  }
  if (payment_method) {
    updateData.payment_method = payment_method
  }

  const { error } = await service
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ message: 'Gagal memperbarui status pembayaran.' }, { status: 500 })
  }

  // Audit event
  await service.from('order_events').insert({
    order_id: id,
    event_type: 'PAYMENT_STATUS_UPDATED',
    actor_id: user.id,
    description: `Staf memperbarui status pembayaran menjadi "${payment_status}"`,
  })

  return NextResponse.json({ success: true, message: 'Status pembayaran berhasil diperbarui.' })
}

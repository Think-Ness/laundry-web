import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, STATUS_TRANSITIONS, type Order, type OrderEvent, type OrderStatus } from '@/types'
import OrderActions from './OrderActions'
import PaymentVerifier from './PaymentVerifier'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: order }, { data: events }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: true }),
  ])

  if (!order) notFound()

  const nextStatuses = STATUS_TRANSITIONS[order.status as OrderStatus] ?? []

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/pesanan"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '8px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Semua Pesanan
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{order.transaction_id}</h1>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
              Dikirim: {order.submitted_at ? new Date(order.submitted_at).toLocaleString('id-ID') : '—'}
            </p>
          </div>
          <StatusBadge status={order.status as OrderStatus} large />
        </div>
      </div>

      {/* Tracking Link Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#DBEAFE', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF' }}>Link Tracking Status Laundry</div>
            <div style={{ fontSize: '11px', color: '#3B82F6', fontFamily: 'monospace', marginTop: '1px' }}>
              /track/{order.transaction_id}
            </div>
          </div>
        </div>
        <Link
          href={`/track/${order.transaction_id}`}
          target="_blank"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: '#2563EB', color: '#fff',
            padding: '6px 14px', borderRadius: '8px',
            fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Lihat Tracking
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Order Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Informasi Pesanan</h2>
          <dl className="space-y-3">
            <DetailRow label="Nama Wali Santri" value={order.customer_name} />
            <DetailRow label="Nama Santri" value={order.student_name} />
            {order.customer_phone && <DetailRow label="No. HP" value={order.customer_phone} />}
            <hr className="border-gray-100" />
            <DetailRow label="Berat Laundry" value={`${order.weight.toFixed(1)} Kg`} />
            <DetailRow label="Harga / Kg" value={`Rp ${order.unit_price.toLocaleString('id-ID')}`} />
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="text-sm font-bold text-gray-700">Total</span>
              <span className="text-base font-bold text-blue-700">Rp {order.total_amount.toLocaleString('id-ID')}</span>
            </div>
            <DetailRow label="Metode Bayar" value={order.payment_method === 'transfer' ? 'Transfer Bank (TF)' : order.payment_method === 'qris' ? 'QRIS Stand' : 'Cash / Tunai'} />
            <DetailRow label="Status Bayar" value={order.payment_status === 'paid' ? 'Lunas' : order.payment_proof_url ? 'Menunggu Verifikasi Bukti' : 'Belum Lunas'} />
            {order.customer_note && (
              <>
                <hr className="border-gray-100" />
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Catatan Wali</span>
                  <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">{order.customer_note}</p>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Timeline + Actions */}
        <div className="space-y-5">
          {/* Payment Verifier & Proof Viewer */}
          <PaymentVerifier
            orderId={order.id}
            paymentMethod={order.payment_method}
            paymentStatus={order.payment_status}
            proofUrl={order.payment_proof_url}
          />

          {/* Workflow Status Actions */}
          <OrderActions
            orderId={order.id}
            currentStatus={order.status as OrderStatus}
            nextStatuses={nextStatuses}
          />

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Riwayat Status</h2>
            <div className="space-y-3">
              {events?.map((event: OrderEvent, i: number) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                    {i < (events.length - 1) && <div className="w-px flex-1 bg-gray-200 mt-1"></div>}
                  </div>
                  <div className="pb-3 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{event.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
              {(!events || events.length === 0) && (
                <p className="text-sm text-gray-400">Belum ada riwayat.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

function StatusBadge({ status, large }: { status: OrderStatus; large?: boolean }) {
  const label = ORDER_STATUS_LABELS[status] ?? status
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    orange: 'bg-orange-50 text-orange-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
  }
  const color = ORDER_STATUS_COLORS[status] ?? 'gray'
  return (
    <span className={`inline-block rounded-full font-semibold ${large ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'} ${colorMap[color]}`}>
      {label}
    </span>
  )
}

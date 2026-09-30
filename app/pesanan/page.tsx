import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Kelola Pesanan — Latansa Laundry',
}

export default async function PesananListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { q, status } = await searchParams

  let query = supabase.from('orders').select('*').order('submitted_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (q && q.trim()) {
    const search = `%${q.trim()}%`
    query = query.or(`transaction_id.ilike.${search},customer_name.ilike.${search},student_name.ilike.${search},student_reg_number.ilike.${search}`)
  }

  const { data: orders } = await query.limit(50)

  const statusOptions = [
    { key: 'all', label: 'Semua Status' },
    { key: 'new', label: 'Baru' },
    { key: 'received', label: 'Diterima' },
    { key: 'processing', label: 'Diproses' },
    { key: 'ready', label: 'Siap' },
    { key: 'completed', label: 'Selesai' },
    { key: 'cancelled', label: 'Dibatalkan' },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Kelola Pesanan</h1>
        <p className="page-subtitle">Daftar semua transaksi laundry santri</p>
      </div>

      {/* Result count */}
      {orders && (
        <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748B' }}>
          Menampilkan <strong style={{ color: '#0F172A' }}>{orders.length}</strong> pesanan
          {(q || (status && status !== 'all')) && (
            <> — <Link href="/pesanan" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Lihat semua</Link></>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Cari No. Transaksi, NIS, atau Nama Santri..."
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#0F172A',
                background: '#F8FAFC',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: '0 1 160px' }}>
            <select
              name="status"
              defaultValue={status || 'all'}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#374151',
                background: '#F8FAFC',
                outline: 'none',
              }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
            <button
              type="submit"
              style={{
                padding: '9px 18px',
                background: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Filter
            </button>
            {(q || (status && status !== 'all')) && (
              <Link
                href="/pesanan"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '9px 14px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                {['No. Transaksi', 'Santri & NIS', 'Wali Santri', 'Layanan', 'Berat', 'Total', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '11px',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders?.map((order: Order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {order.transaction_id}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{order.student_name}</div>
                    {order.student_reg_number && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: '10px',
                        background: '#F1F5F9', color: '#64748B',
                        padding: '1px 6px', borderRadius: '4px', marginTop: '2px',
                        display: 'inline-block',
                      }}>
                        NIS: {order.student_reg_number}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }} className="hide-mobile">
                    <div>{order.customer_name}</div>
                    {order.customer_phone && (
                      <div style={{ color: '#94A3B8', fontSize: '11px' }}>{order.customer_phone}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }} className="hide-mobile">
                    <span style={{
                      background: '#EFF6FF', color: '#2563EB',
                      padding: '2px 8px', borderRadius: '6px',
                      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                    }}>
                      {order.service_type || 'Reguler'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500 }} className="hide-mobile">
                    {Number(order.weight).toFixed(1)} kg
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    Rp {Number(order.total_amount).toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={order.status as OrderStatus} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/pesanan/${order.id}`}
                      style={{
                        display: 'inline-block',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ padding: '56px 16px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ marginBottom: '10px', opacity: 0.35 }}>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Tidak ada pesanan ditemukan</div>
                    <div style={{ fontSize: '12px' }}>
                      {q ? `Tidak ada hasil untuk "${q}"` : 'Belum ada pesanan yang masuk'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_LABELS[status] ?? status
  const colorMap: Record<string, { bg: string; color: string }> = {
    blue:   { bg: '#EFF6FF', color: '#2563EB' },
    indigo: { bg: '#EEF2FF', color: '#4F46E5' },
    orange: { bg: '#FFF7ED', color: '#C2410C' },
    green:  { bg: '#F0FDF4', color: '#16A34A' },
    red:    { bg: '#FEF2F2', color: '#DC2626' },
    gray:   { bg: '#F8FAFC', color: '#64748B' },
  }
  const color = ORDER_STATUS_COLORS[status] ?? 'gray'
  const { bg, color: textColor } = colorMap[color] ?? colorMap.gray
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color: textColor,
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

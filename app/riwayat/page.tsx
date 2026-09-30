import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { type Order } from '@/types'

export const metadata: Metadata = {
  title: 'Riwayat Pesanan — Latansa Laundry',
}

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { q, status: statusFilter } = await searchParams

  let query = supabase
    .from('orders')
    .select('*')
    .in('status', ['completed', 'cancelled'])
    .order('submitted_at', { ascending: false })

  if (statusFilter === 'completed') {
    query = supabase.from('orders').select('*').eq('status', 'completed').order('submitted_at', { ascending: false })
  } else if (statusFilter === 'cancelled') {
    query = supabase.from('orders').select('*').eq('status', 'cancelled').order('submitted_at', { ascending: false })
  }

  if (q && q.trim()) {
    const search = `%${q.trim()}%`
    query = query.or(`transaction_id.ilike.${search},customer_name.ilike.${search},student_name.ilike.${search}`)
  }

  const { data: orders } = await query.limit(50)

  const completedCount = orders?.filter(o => o.status === 'completed').length ?? 0
  const cancelledCount = orders?.filter(o => o.status === 'cancelled').length ?? 0

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Riwayat Pesanan</h1>
        <p className="page-subtitle">Arsip transaksi laundry yang telah selesai atau dibatalkan</p>
      </div>

      {/* Summary Chips */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryChip
          label="Total Ditampilkan"
          value={(orders?.length ?? 0).toString()}
          color="#64748B"
          bg="#F8FAFC"
        />
        <SummaryChip
          label="Selesai"
          value={completedCount.toString()}
          color="#16A34A"
          bg="#F0FDF4"
        />
        <SummaryChip
          label="Dibatalkan"
          value={cancelledCount.toString()}
          color="#DC2626"
          bg="#FEF2F2"
        />
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <form method="GET" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Cari no. transaksi, nama santri, atau wali..."
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none',
                color: '#0F172A',
                background: '#F8FAFC',
              }}
            />
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <select
              name="status"
              defaultValue={statusFilter || 'all'}
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
              <option value="all">Semua Status</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
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
              Cari
            </button>
            {(q || (statusFilter && statusFilter !== 'all')) && (
              <Link
                href="/riwayat"
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

      {/* Table */}
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
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
                    {order.customer_name}
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
                    {order.status === 'completed' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F0FDF4', color: '#16A34A', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Selesai
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', color: '#DC2626', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Dibatalkan
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/pesanan/${order.id}`}
                      style={{
                        display: 'inline-block',
                        background: '#F1F5F9',
                        color: '#475569',
                        padding: '4px 10px',
                        borderRadius: '7px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Lihat →
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ padding: '56px 16px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ marginBottom: '10px', opacity: 0.35 }}>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Tidak ada riwayat ditemukan</div>
                    <div style={{ fontSize: '12px' }}>
                      {q ? `Tidak ada hasil untuk "${q}"` : 'Belum ada pesanan yang selesai atau dibatalkan'}
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

function SummaryChip({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: bg,
      border: `1px solid ${color}25`,
      borderRadius: '999px',
      padding: '5px 14px',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: '#64748B' }}>{label}</span>
    </div>
  )
}

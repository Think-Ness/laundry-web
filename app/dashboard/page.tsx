import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Dashboard — Latansa Laundry',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch stats in parallel
  const [
    { count: newCount },
    { count: receivedCount },
    { count: processingCount },
    { count: readyCount },
    { count: completedTodayCount },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'received'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('submitted_at', new Date().toISOString().slice(0, 10)),
  ])

  // Recent active orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .not('status', 'in', '("completed","cancelled")')
    .order('submitted_at', { ascending: false })
    .limit(10)

  const totalActive = (newCount ?? 0) + (receivedCount ?? 0) + (processingCount ?? 0) + (readyCount ?? 0)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Selamat datang — pantau semua pesanan laundry santri</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Pesanan Baru"
          value={newCount ?? 0}
          sub="Menunggu konfirmasi"
          accent="#3B82F6"
          accentBg="#EFF6FF"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          }
        />
        <StatCard
          label="Diterima"
          value={receivedCount ?? 0}
          sub="Dalam antrian"
          accent="#8B5CF6"
          accentBg="#F5F3FF"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7m0 0H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
            </svg>
          }
        />
        <StatCard
          label="Diproses"
          value={processingCount ?? 0}
          sub="Sedang dicuci"
          accent="#F59E0B"
          accentBg="#FFFBEB"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          }
        />
        <StatCard
          label="Siap Diambil"
          value={readyCount ?? 0}
          sub="Siap diserahkan"
          accent="#10B981"
          accentBg="#ECFDF5"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        />
      </div>

      {/* Summary Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>
            PESANAN AKTIF HARI INI
          </div>
          <div style={{ color: '#fff', fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>
            {totalActive}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' }}>
            {completedTodayCount ?? 0} transaksi selesai hari ini
          </div>
        </div>
        <Link
          href="/pesanan"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          Kelola Pesanan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>

      {/* Recent Orders Table */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', margin: 0 }}>
              Pesanan Aktif Terbaru
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0' }}>
              10 pesanan aktif terakhir
            </p>
          </div>
          <Link
            href="/pesanan"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              color: '#2563EB', fontWeight: 600, fontSize: '12.5px', textDecoration: 'none',
            }}
          >
            Lihat semua
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                {['No. Transaksi', 'Santri', 'Wali', 'Layanan', 'Total', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
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
                  <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.student_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hide-mobile">
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
                        background: '#F1F5F9',
                        color: '#475569',
                        padding: '4px 10px',
                        borderRadius: '7px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                    <div style={{ marginBottom: '8px', opacity: 0.4 }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    Belum ada pesanan aktif saat ini.
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

function StatCard({
  label, value, sub, accent, accentBg, icon
}: {
  label: string; value: number; sub: string; accent: string; accentBg: string;
  icon: ReactNode
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '12px',
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{sub}</div>
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
  const colorKey = ORDER_STATUS_COLORS[status] ?? 'gray'
  const { bg, color } = colorMap[colorKey] ?? colorMap.gray
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color,
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

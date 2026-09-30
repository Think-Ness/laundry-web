import type { Metadata } from 'next'
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

  // Fetch stats
  const [{ count: newCount }, { count: receivedCount }, { count: processingCount }, { count: readyCount }] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'received'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'ready'),
    ])

  // Recent orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .not('status', 'in', '("completed","cancelled")')
    .order('submitted_at', { ascending: false })
    .limit(30)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Laundry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola pesanan laundry wali santri</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600">Online</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Pesanan Baru" value={newCount ?? 0} sub="Menunggu konfirmasi" color="blue" />
        <StatCard label="Diterima" value={receivedCount ?? 0} sub="Dalam antrian" color="indigo" />
        <StatCard label="Diproses" value={processingCount ?? 0} sub="Sedang dicuci" color="orange" />
        <StatCard label="Siap" value={readyCount ?? 0} sub="Siap diambil" color="green" />
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Pesanan Aktif</h2>
          <Link href="/pesanan" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Lihat semua →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['No. Transaksi', 'Nama Wali', 'Nama Santri', 'Berat', 'Total', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders?.map((order: Order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">
                    {order.transaction_id}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{order.student_name}</td>
                  <td className="px-4 py-3 text-gray-700">{order.weight.toFixed(1)} Kg</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/pesanan/${order.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
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

function StatCard({ label, value, sub, color }: {
  label: string; value: number; sub: string; color: string
}) {
  const colors: Record<string, string> = {
    blue:   'text-blue-700',
    indigo: 'text-indigo-700',
    orange: 'text-orange-600',
    green:  'text-green-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colors[color] ?? 'text-gray-800'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_LABELS[status] ?? status
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    orange: 'bg-orange-50 text-orange-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
  }
  const colorKey = ORDER_STATUS_COLORS[status] ?? 'gray'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[colorKey] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

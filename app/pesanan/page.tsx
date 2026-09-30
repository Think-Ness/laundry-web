import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from '@/types'

export const metadata: Metadata = {
  title: 'Daftar Pesanan — Latansa Laundry',
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Pesanan Laundry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daftar semua transaksi dan antrian cuci santri</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <form method="GET" className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Cari No. Transaksi, NIS, atau Nama Santri..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              name="status"
              defaultValue={status || 'all'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors"
            >
              Cari
            </button>
            {(q || (status && status !== 'all')) && (
              <Link
                href="/pesanan"
                className="px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg flex items-center"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">No. Transaksi</th>
                <th className="px-4 py-3">Santri & NIS</th>
                <th className="px-4 py-3">Wali Santri</th>
                <th className="px-4 py-3">Layanan</th>
                <th className="px-4 py-3">Berat</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map((order: Order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                    {order.transaction_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{order.student_name}</div>
                    {order.student_reg_number && (
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        NIS: {order.student_reg_number}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    <div>{order.customer_name}</div>
                    {order.customer_phone && (
                      <span className="text-gray-400">{order.customer_phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs uppercase font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {order.service_type || 'Biasa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {Number(order.weight).toFixed(1)} Kg
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    Rp {Number(order.total_amount).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/pesanan/${order.id}`}
                      className="inline-block px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded transition-colors"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}

              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Belum ada pesanan yang sesuai filter.
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
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    orange: 'bg-orange-50 text-orange-700 border border-orange-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  }
  const color = ORDER_STATUS_COLORS[status] ?? 'gray'
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorMap[color]}`}>
      {label}
    </span>
  )
}

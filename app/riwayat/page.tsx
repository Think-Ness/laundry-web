import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { type Order } from '@/types'

export const metadata: Metadata = {
  title: 'Riwayat Pesanan Selesai — Latansa Laundry',
}

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { q } = await searchParams

  let query = supabase
    .from('orders')
    .select('*')
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false })

  if (q && q.trim()) {
    const search = `%${q.trim()}%`
    query = query.or(`transaction_id.ilike.${search},customer_name.ilike.${search},student_name.ilike.${search}`)
  }

  const { data: orders } = await query.limit(50)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Riwayat Pesanan Selesai & Dibatalkan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Arsip transaksi laundry yang sudah diserahkan ke santri</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <form method="GET" className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Cari transaksi atau nama santri..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg"
          >
            Cari
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">No. Transaksi</th>
                <th className="px-4 py-3">Santri & NIS</th>
                <th className="px-4 py-3">Wali Santri</th>
                <th className="px-4 py-3">Berat</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map((order: Order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                    {order.transaction_id}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {order.student_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {order.customer_name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {Number(order.weight).toFixed(1)} Kg
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    Rp {Number(order.total_amount).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {order.status === 'completed' ? '✅ Selesai' : '❌ Dibatalkan'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/pesanan/${order.id}`}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      Lihat →
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Belum ada riwayat pesanan selesai.
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

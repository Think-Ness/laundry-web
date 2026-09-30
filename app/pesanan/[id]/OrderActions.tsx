'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'

interface Props {
  orderId: string
  currentStatus: OrderStatus
  nextStatuses: OrderStatus[]
}

const ACTION_LABELS: Record<OrderStatus, string> = {
  waiting_confirmation: 'Konfirmasi',
  new: 'Terima Pesanan',
  received: 'Mulai Proses',
  processing: 'Tandai Selesai Proses',
  ready: 'Pesanan Selesai',
  completed: '',
  cancelled: '',
}

const ACTION_COLORS: Record<OrderStatus, string> = {
  waiting_confirmation: 'bg-gray-600 hover:bg-gray-700',
  new: 'bg-blue-600 hover:bg-blue-700',
  received: 'bg-indigo-600 hover:bg-indigo-700',
  processing: 'bg-orange-600 hover:bg-orange-700',
  ready: 'bg-green-600 hover:bg-green-700',
  completed: '',
  cancelled: '',
}

export default function OrderActions({ orderId, currentStatus, nextStatuses }: Props) {
  const [loading, setLoading] = useState<OrderStatus | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  async function updateStatus(newStatus: OrderStatus) {
    setLoading(newStatus)
    setError('')

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Gagal memperbarui status.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Gagal terhubung ke server.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="font-semibold text-gray-800 mb-3">Tindakan</h2>
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {nextStatuses.map(status => (
          <button
            key={status}
            onClick={() => updateStatus(status)}
            disabled={loading !== null}
            className={`w-full py-3 px-4 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${ACTION_COLORS[status] ?? 'bg-gray-600'}`}
          >
            {loading === status ? 'Memperbarui...' : (ACTION_LABELS[status] || ORDER_STATUS_LABELS[status])}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Status saat ini: <strong>{ORDER_STATUS_LABELS[currentStatus]}</strong>
      </p>
    </div>
  )
}

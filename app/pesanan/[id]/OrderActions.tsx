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
  waiting_confirmation: 'Konfirmasi Pesanan',
  new: 'Terima Pesanan',
  received: 'Terima Pakaian di Laundry',
  processing: 'Mulai Proses Cuci',
  ready: 'Cucian Selesai (Siap Diambil)',
  completed: 'Serahkan Cucian ke Santri (Selesai)',
  cancelled: 'Batalkan Pesanan',
}

const ACTION_COLORS: Record<OrderStatus, string> = {
  waiting_confirmation: 'bg-gray-600 hover:bg-gray-700 text-white',
  new: 'bg-blue-600 hover:bg-blue-700 text-white',
  received: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  processing: 'bg-amber-600 hover:bg-amber-700 text-white',
  ready: 'bg-blue-600 hover:bg-blue-700 text-white',
  completed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  cancelled: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
}

export default function OrderActions({ orderId, currentStatus, nextStatuses }: Props) {
  const [loading, setLoading] = useState<OrderStatus | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  async function updateStatus(newStatus: OrderStatus) {
    if (newStatus === 'cancelled') {
      const confirmCancel = window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')
      if (!confirmCancel) return
    }

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
      <h2 className="font-semibold text-gray-800 mb-2">Tindakan</h2>

      {/* Helper text explaining the current state */}
      {currentStatus === 'ready' && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Cucian sudah selesai dicuci & disetrika. Saat santri/wali datang mengambil pakaian di counter, tekan tombol di bawah untuk menyelesaikan pesanan:
        </p>
      )}
      {currentStatus === 'processing' && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Pakaian sedang diproses. Jika sudah selesai disetrika & packing, pilih status selanjutnya:
        </p>
      )}
      {currentStatus === 'received' && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Pakaian fisik telah diterima oleh staf laundry. Tekan tombol di bawah untuk mulai proses pencucian:
        </p>
      )}
      {currentStatus === 'new' && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Pesanan baru dari stand. Tekan tombol di bawah saat pakaian fisik diserahkan ke bagian laundry:
        </p>
      )}
      {currentStatus === 'completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-xs mb-3 flex items-center gap-2">
          <span>✅</span>
          <span>Pesanan ini telah selesai 100% dan pakaian telah diserahkan kembali.</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          {error}
        </div>
      )}

      {nextStatuses.length > 0 ? (
        <div className="space-y-2">
          {nextStatuses.map(status => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={loading !== null}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${ACTION_COLORS[status] ?? 'bg-blue-600 text-white'}`}
            >
              {loading === status ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Memperbarui...
                </>
              ) : (
                <>
                  {status === 'completed' && '✅'}
                  {status === 'ready' && '📦'}
                  {status === 'processing' && '⚙️'}
                  {status === 'received' && '📥'}
                  {status === 'cancelled' && '✕'}
                  {ACTION_LABELS[status] || ORDER_STATUS_LABELS[status]}
                </>
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-between items-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
        <span>Status saat ini:</span>
        <strong className="text-gray-700 font-semibold">{ORDER_STATUS_LABELS[currentStatus]}</strong>
      </div>
    </div>
  )
}

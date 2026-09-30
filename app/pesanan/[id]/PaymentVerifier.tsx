'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  paymentMethod: string
  paymentStatus: string
  proofUrl?: string | null
}

export default function PaymentVerifier({
  orderId,
  paymentMethod,
  paymentStatus,
  proofUrl,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState(paymentStatus)
  const router = useRouter()

  async function handleUpdateStatus(newStatus: 'paid' | 'pending') {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus }),
      })

      if (res.ok) {
        setStatus(newStatus)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.message || 'Gagal memperbarui status pembayaran.')
      }
    } catch {
      alert('Gagal terhubung ke server.')
    } finally {
      setLoading(false)
    }
  }

  const isPaid = status === 'paid'
  const isTransferOrQris = paymentMethod === 'transfer' || paymentMethod === 'qris'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Status Pembayaran</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            Metode: <strong className="text-gray-700 uppercase">{paymentMethod === 'transfer' ? 'Transfer Bank' : paymentMethod === 'qris' ? 'QRIS Stand' : 'Cash / Tunai'}</strong>
          </div>
        </div>

        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPaid
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            : proofUrl
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          {isPaid ? 'Lunas' : proofUrl ? 'Bukti Terunggah (Verifikasi)' : 'Belum Lunas'}
        </span>
      </div>

      {/* Proof Photo Display */}
      {proofUrl ? (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-between">
            <span>Foto Bukti Pembayaran / Struk</span>
            <span className="text-blue-600 font-normal cursor-pointer hover:underline" onClick={() => setShowModal(true)}>
              Perbesar
            </span>
          </div>
          <div className="flex gap-3 items-center">
            <img
              src={proofUrl}
              alt="Bukti Transfer"
              onClick={() => setShowModal(true)}
              className="w-16 h-16 object-cover rounded-md border border-gray-300 cursor-pointer shadow-sm hover:opacity-90 shrink-0"
            />
            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-800">Bukti diunggah oleh wali/santri</p>
              <p className="text-gray-500 mt-0.5">Periksa kesesuaian nominal sebelum memvalidasi.</p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                Lihat Foto Penuh &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : isTransferOrQris ? (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Pesanan ini menggunakan pembayaran <strong>{paymentMethod === 'transfer' ? 'Transfer Bank' : 'QRIS'}</strong>, namun wali santri belum mengunggah bukti pembayaran via scan nota.
        </div>
      ) : null}

      {/* Verification Actions */}
      <div className="flex gap-2">
        {!isPaid ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleUpdateStatus('paid')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {loading ? 'Menyimpan...' : 'Verifikasi & Tandai Lunas'}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleUpdateStatus('pending')}
            className="text-xs text-gray-600 hover:text-gray-800 border border-gray-300 bg-white hover:bg-gray-50 py-1.5 px-3 rounded-lg font-medium"
          >
            {loading ? 'Memproses...' : 'Ubah ke Belum Lunas'}
          </button>
        )}
      </div>

      {/* Modal Full Image */}
      {showModal && proofUrl && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto p-4 relative"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Bukti Pembayaran Transaksi</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <img
              src={proofUrl}
              alt="Bukti Transfer Penuh"
              className="w-full h-auto rounded-lg border border-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  )
}

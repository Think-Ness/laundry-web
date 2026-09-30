import { notFound } from 'next/navigation'
import { decodeQrToken, verifyQrSignature, formatRupiah } from '@/lib/qr-verifier'
import ConfirmationForm from './ConfirmationForm'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: 'Konfirmasi Laundry — Latansa Laundry',
  description: 'Konfirmasi pengiriman laundry ke bagian laundry pondok.',
}

export default async function ConfirmationPage({ params }: Props) {
  const { token } = await params

  // Decode and verify QR payload
  const payload = decodeQrToken(token)
  if (!payload) notFound()

  let isValid = false
  try {
    isValid = await verifyQrSignature(payload)
  } catch (err) {
    console.error('Signature verification failed:', err)
  }

  if (!isValid) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-red-200 p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-red-700 mb-2">QR Tidak Valid</h1>
          <p className="text-sm text-gray-500">
            QR Code ini tidak dapat diverifikasi. Pastikan Anda memindai QR dari nota yang benar.
          </p>
          <p className="text-sm text-gray-400 mt-3">
            Kode Transaksi: <strong className="font-mono">{payload.id}</strong>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-4 pt-8 pb-16">
      {/* Header */}
      <div className="w-full max-w-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🧺</span>
          <span className="font-bold text-gray-800">Latansa Laundry</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Konfirmasi Laundry</h1>
        <p className="text-sm text-gray-500 mt-1">
          Periksa data berikut, tambahkan catatan jika perlu, lalu kirim ke bagian Laundry.
        </p>
      </div>

      {/* Data Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">No. Transaksi</span>
          <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
            {payload.id}
          </span>
        </div>

        <div className="space-y-3">
          <DataRow label="Nama Wali Santri" value={payload.wali} />
          <DataRow label="Nama Santri" value={payload.santri} />
          {payload.nis && <DataRow label="No. Reg / NIS Santri" value={payload.nis} />}
          {payload.hp && <DataRow label="No. HP" value={payload.hp} />}

          <hr className="border-gray-100" />

          {payload.layanan && (
            <DataRow
              label="Tipe Layanan"
              value={payload.layanan.toUpperCase()}
            />
          )}
          <DataRow label="Berat Laundry" value={`${payload.kg.toFixed(1)} Kg`} />
          <DataRow label="Harga / Kg" value={formatRupiah(payload.harga)} />

          <div className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-lg font-bold text-blue-700">{formatRupiah(payload.total)}</span>
          </div>

          <DataRow
            label="Metode Pembayaran"
            value={payload.bayar === 'qris' ? 'QRIS' : 'Cash'}
          />
          <DataRow
            label="Status"
            value={payload.lunas ? '✅ Lunas' : '⚠️ Belum Lunas'}
          />
        </div>
      </div>

      {/* Confirmation Form (Client Component) */}
      <ConfirmationForm payload={payload} token={token} />

      <p className="text-xs text-gray-400 text-center mt-4 max-w-sm px-2">
        Data akan langsung diteruskan ke sistem laundry pondok setelah Anda menekan tombol kirim.
      </p>
    </main>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}

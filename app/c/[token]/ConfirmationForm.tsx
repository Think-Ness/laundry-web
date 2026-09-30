'use client'

import { useState } from 'react'
import type { QrPayload } from '@/lib/qr-verifier'

interface Props {
  payload: QrPayload
  token: string
}

type State = 'idle' | 'loading' | 'success' | 'already_submitted' | 'error'

export default function ConfirmationForm({ payload, token }: Props) {
  const [note, setNote] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || state === 'success') return

    setState('loading')

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, note }),
      })

      const data = await res.json()

      if (res.status === 200) {
        setState('success')
      } else if (res.status === 409) {
        setState('already_submitted')
      } else {
        setState('error')
        setErrorMsg(data.message || 'Terjadi kesalahan. Coba lagi.')
      }
    } catch {
      setState('error')
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet Anda.')
    }
  }

  if (state === 'success') {
    return (
      <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-green-700 mb-2">Laundry Berhasil Dikirim!</h2>
        <p className="text-sm text-green-600">
          Data laundry Anda sudah diterima dan akan segera diproses oleh bagian laundry pondok.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Kode: <span className="font-mono font-bold">{payload.id}</span>
        </p>
      </div>
    )
  }

  if (state === 'already_submitted') {
    return (
      <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">ℹ️</div>
        <h2 className="text-lg font-bold text-blue-700 mb-2">Sudah Dikirim</h2>
        <p className="text-sm text-blue-600">
          Laundry ini sudah dikonfirmasi sebelumnya. Data Anda sudah ada di sistem laundry pondok.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Kode: <span className="font-mono font-bold">{payload.id}</span>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catatan Tambahan
          <span className="text-gray-400 font-normal ml-1">(opsional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
          placeholder="Contoh: pakaian putih jangan pakai pewangi, ada seragam batik..."
          disabled={state === 'loading'}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/500</p>
      </div>

      {state === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {state === 'loading' ? (
          <>
            <LoadingSpinner />
            Mengirim...
          </>
        ) : (
          '🚀 Kirim ke Laundry'
        )}
      </button>
    </form>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

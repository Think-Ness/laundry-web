'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TrackSearchPage() {
  const [trxId, setTrxId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = trxId.trim()
    if (!cleanId) {
      setError('Masukkan nomor nota atau ID transaksi')
      return
    }
    setError('')
    router.push(`/track/${encodeURIComponent(cleanId)}`)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0D1929 0%, #0F172A 60%, #111827 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <circle cx="12" cy="13" r="4"/>
              <path d="M6 6h.01M9 6h3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>Latansa Laundry</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Pelacakan Cucian Online</div>
          </div>
        </div>

        <Link
          href="/auth/login"
          style={{
            fontSize: '11.5px',
            color: '#94A3B8',
            textDecoration: 'none',
            padding: '5px 12px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Masuk Staf →
        </Link>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px 24px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
              borderRadius: '14px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#93C5FD',
              marginBottom: '14px',
              boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 6px' }}>
              Lacak Status Laundry
            </h1>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              Scan QR pada nota atau masukkan Nomor Transaksi / Nota Anda di bawah
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: '6px',
                letterSpacing: '0.04em',
              }}>
                NOMOR TRANSAKSI / NOTA
              </label>
              <input
                type="text"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                placeholder="Contoh: TRX-20260930-0001"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: error ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.15)',
                  color: '#F8FAFC',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ fontSize: '11px', color: '#F87171', marginTop: '5px' }}>
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                fontSize: '13.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              Cek Status Sekarang
            </button>
          </form>

          <div style={{
            marginTop: '22px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            fontSize: '11px',
            color: '#64748B',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            💡 Status cucian diperbarui secara otomatis oleh petugas: Diterima → Dicuci → Siap Diambil → Selesai.
          </div>
        </div>
      </div>
    </main>
  )
}

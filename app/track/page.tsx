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
      backgroundColor: '#F8FAFC',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: '#2563EB',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <circle cx="12" cy="13" r="4"/>
              <path d="M6 6h.01M9 6h3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Latansa Laundry</div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Pelacakan Cucian Santri</div>
          </div>
        </div>

        <Link
          href="/auth/login"
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#475569',
            textDecoration: 'none',
            padding: '5px 12px',
            borderRadius: '6px',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
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
          maxWidth: '420px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '32px 24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '12px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#2563EB',
              marginBottom: '12px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
              Lacak Status Laundry
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Scan QR pada nota atau masukkan Nomor Transaksi / Nota Anda di bawah
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
                letterSpacing: '0.02em',
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
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: error ? '1px solid #EF4444' : '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '5px' }}>
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.15s',
              }}
            >
              Cek Status Sekarang
            </button>
          </form>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #F1F5F9',
            fontSize: '11.5px',
            color: '#64748B',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            Status cucian diperbarui bertahap oleh petugas: Diterima → Dicuci → Siap Diambil → Selesai.
          </div>
        </div>
      </div>
    </main>
  )
}

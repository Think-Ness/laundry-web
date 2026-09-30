'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QrPayload } from '@/lib/qr-verifier'

export interface OrderInfo {
  id: string
  transaction_id: string
  status: string
  submitted_at?: string | null
  received_at?: string | null
  processing_at?: string | null
  completed_at?: string | null
  customer_note?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface Props {
  payload: QrPayload
  token: string
  initialOrder: OrderInfo | null
}

type State = 'idle' | 'loading' | 'success' | 'already_submitted' | 'error'

const STATUS_STEPS = [
  { key: 'new', label: 'Pesanan Diterima', desc: 'Order terdaftar di stand laundry' },
  { key: 'received', label: 'Diterima Laundry', desc: 'Pakaian telah diterima petugas laundry' },
  { key: 'processing', label: 'Sedang Dicuci', desc: 'Pakaian sedang dicuci & dikeringkan' },
  { key: 'ready', label: 'Siap Diambil', desc: 'Selesai disetrika, rapi & siap diambil' },
  { key: 'completed', label: 'Selesai', desc: 'Laundry telah diserahkan kembali' },
]

const STATUS_ORDER = ['new', 'received', 'processing', 'ready', 'completed']

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

export default function ConfirmationForm({ payload, token, initialOrder }: Props) {
  const [note, setNote] = useState(initialOrder?.customer_note || '')
  const [order, setOrder] = useState<OrderInfo | null>(initialOrder)
  const [state, setState] = useState<State>(initialOrder ? 'already_submitted' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || state === 'success') return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, note }),
      })

      const data = await res.json()

      if (res.status === 200 || res.status === 201) {
        setState('success')
        setOrder({
          id: data.order_id || 'new',
          transaction_id: payload.id,
          status: 'new',
          customer_note: note,
          submitted_at: new Date().toISOString(),
        })
        router.refresh()
      } else if (res.status === 409) {
        setState('already_submitted')
        setOrder({
          id: data.order_id || 'existing',
          transaction_id: payload.id,
          status: 'new',
          customer_note: note,
        })
        router.refresh()
      } else {
        setState('error')
        setErrorMsg(data.message || 'Terjadi kesalahan saat mengirim. Silakan coba lagi.')
      }
    } catch {
      setState('error')
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet Anda.')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 800)
  }

  const isSubmitted = state === 'success' || state === 'already_submitted' || !!order
  const currentStatus = order?.status || 'new'
  const currentStepIndex = getStepIndex(currentStatus)
  const isCancelled = currentStatus === 'cancelled'
  const isCompleted = currentStatus === 'completed'

  // If already submitted, render the progress tracker directly below the data
  if (isSubmitted) {
    return (
      <div style={{ width: '100%' }}>
        {/* Success / Status Banner */}
        <div style={{
          background: state === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
          border: state === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(59,130,246,0.3)',
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              borderRadius: '8px',
              background: state === 'success' ? '#16A34A' : '#2563EB',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: state === 'success' ? '#4ADE80' : '#93C5FD',
              }}>
                {state === 'success' ? 'Laundry Berhasil Dikirim!' : 'Pesanan Sudah Dikonfirmasi'}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                Status cucian dapat dipantau langsung di bawah ini
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            title="Muat ulang status terbaru"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#CBD5E1',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: isRefreshing ? 'transform 0.8s ease' : 'none',
              }}
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {isRefreshing ? 'Memuat...' : 'Refresh'}
          </button>
        </div>

        {/* Progress Stepper Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: '12px',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em' }}>
                PROGRES PENGERJAAN
              </div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px', fontWeight: 600 }}>
                Status saat ini:{' '}
                <span style={{ color: isCompleted ? '#4ADE80' : isCancelled ? '#F87171' : '#60A5FA' }}>
                  {STATUS_STEPS[currentStepIndex]?.label || currentStatus}
                </span>
              </div>
            </div>

            {/* Pulse live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(59,130,246,0.15)', color: '#60A5FA',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '999px', fontSize: '10.5px', fontWeight: 700,
              padding: '3px 9px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }}/>
              LIVE TRACKING
            </div>
          </div>

          {!isCancelled ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStepIndex
                const active = i === currentStepIndex
                const pending = i > currentStepIndex
                const isLast = i === STATUS_STEPS.length - 1

                return (
                  <div key={step.key} style={{ display: 'flex', gap: '14px' }}>
                    {/* Indicator Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%',
                        background: done ? '#16A34A' : active ? '#2563EB' : 'rgba(255,255,255,0.06)',
                        border: active ? '2px solid #3B82F6' : done ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: active ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                        transition: 'all 0.3s ease',
                        flexShrink: 0,
                      }}>
                        {done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : active ? (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                        ) : (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                        )}
                      </div>
                      {!isLast && (
                        <div style={{
                          width: '2px',
                          flex: 1,
                          minHeight: '22px',
                          background: done ? '#16A34A' : 'rgba(255,255,255,0.08)',
                          margin: '4px 0',
                        }} />
                      )}
                    </div>

                    {/* Step details */}
                    <div style={{
                      paddingBottom: isLast ? '0' : '16px',
                      paddingTop: '4px',
                    }}>
                      <div style={{
                        fontSize: '13.5px',
                        fontWeight: active ? 700 : done ? 600 : 500,
                        color: done ? '#4ADE80' : active ? '#F1F5F9' : '#475569',
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: '11px', color: pending ? '#334155' : '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                        {step.desc}
                      </div>
                      {active && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: 'rgba(59,130,246,0.15)', color: '#60A5FA',
                          border: '1px solid rgba(59,130,246,0.25)',
                          borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', marginTop: '6px',
                        }}>
                          Sedang Berlangsung
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '12px',
              color: '#F87171',
              fontSize: '12.5px',
              textAlign: 'center',
            }}>
              Pesanan ini telah dibatalkan.
            </div>
          )}

          {/* Customer Note Display */}
          {(order?.customer_note || note) && (
            <div style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: '4px' }}>
                CATATAN ANDA
              </div>
              <div style={{
                fontSize: '12px',
                color: '#E2E8F0',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}>
                {order?.customer_note || note}
              </div>
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#64748B',
          lineHeight: 1.6,
          padding: '0 8px',
        }}>
          💡 Simpan nota ini. Anda dapat memindai kembali QR code kapan saja untuk memeriksa pembaruan status pengerjaan laundry.
        </div>
      </div>
    )
  }

  // If not yet submitted, render the Confirmation Form
  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '16px',
      }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: '#CBD5E1',
          marginBottom: '8px',
          letterSpacing: '0.04em',
        }}>
          CATATAN TAMBAHAN UNTUK PETUGAS
          <span style={{ color: '#64748B', fontWeight: 400, marginLeft: '6px' }}>(opsional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'none',
          }}
          placeholder="Contoh: baju putih jangan dicampur, ada baju batik, mohon setrika licin..."
          disabled={state === 'loading'}
        />
        <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '5px', textAlign: 'right' }}>
          {note.length}/500
        </div>
      </div>

      {state === 'error' && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          color: '#F87171',
          fontSize: '12px',
          marginBottom: '14px',
        }}>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: '12px',
          background: state === 'loading'
            ? 'rgba(59,130,246,0.5)'
            : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 700,
          border: 'none',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
        }}
      >
        {state === 'loading' ? (
          <>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
            </svg>
            Mengirim Data...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Kirim ke Bagian Laundry
          </>
        )}
      </button>

      <p style={{
        fontSize: '11px',
        color: '#64748B',
        textAlign: 'center',
        marginTop: '12px',
        lineHeight: 1.5,
      }}>
        Setelah dikirim, status pengerjaan cucian akan langsung muncul di halaman ini.
      </p>
    </form>
  )
}

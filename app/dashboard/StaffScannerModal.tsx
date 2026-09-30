'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface ScannedItem {
  id: string
  transaction_id: string
  student_name: string
  customer_name: string
  weight: number
  total_amount: number
  status: string
  time: string
  action_desc: string
}

interface StaffScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccessScan?: () => void
}

export default function StaffScannerModal({ isOpen, onClose, onSuccessScan }: StaffScannerModalProps) {
  const [targetStatus, setTargetStatus] = useState<'received' | 'processing' | 'ready'>('received')
  const [isCamMode, setIsCamMode] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [liveResult, setLiveResult] = useState<{
    type: 'success' | 'info' | 'error'
    message: string
    order?: any
  } | null>(null)
  const [history, setHistory] = useState<ScannedItem[]>([])
  const [isCamActive, setIsCamActive] = useState(false)
  const [camStatusText, setCamStatusText] = useState('Menginisialisasi kamera...')

  const inputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const html5QrRef = useRef<any>(null)

  // Soft cashier beep synth
  function playBeep(isSuccess = true) {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      if (isSuccess) {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.11)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(320, ctx.currentTime)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      }
    } catch (e) {}
  }

  // Autofocus input on open
  useEffect(() => {
    if (isOpen && !isCamMode) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isCamMode])

  // Stop camera when closing
  useEffect(() => {
    if (!isOpen && isCamActive) {
      stopCamera()
    }
  }, [isOpen, isCamActive])

  async function handleScanSubmit(codeToScan?: string) {
    const code = (codeToScan || inputValue).trim()
    if (!code || isSubmitting) return

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, targetStatus }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        playBeep(true)

        if (data.already_processed) {
          // Double scan notice
          setLiveResult({
            type: 'info',
            message: data.message,
            order: data.order,
          })
        } else {
          setLiveResult({
            type: 'success',
            message: data.message,
            order: data.order,
          })

          const newItem: ScannedItem = {
            id: data.order.id,
            transaction_id: data.order.transaction_id,
            student_name: data.order.student_name,
            customer_name: data.order.customer_name,
            weight: data.order.weight,
            total_amount: data.order.total_amount,
            status: data.order.status,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            action_desc: data.action_desc,
          }

          setHistory(prev => [newItem, ...prev])
          if (onSuccessScan) onSuccessScan()
        }
      } else {
        playBeep(false)
        setLiveResult({
          type: 'error',
          message: data.message || 'Gagal memproses kode QR.',
        })
      }
    } catch (err: any) {
      playBeep(false)
      setLiveResult({
        type: 'error',
        message: 'Terjadi gangguan jaringan atau server.',
      })
    } finally {
      setIsSubmitting(false)
      setInputValue('')
      if (!isCamMode) {
        setTimeout(() => inputRef.current?.focus(), 60)
      }
    }
  }

  async function startCamera() {
    try {
      setCamStatusText('Memuat scanner kamera...')
      if (!(window as any).Html5Qrcode) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Gagal memuat html5-qrcode'))
          document.body.appendChild(script)
        })
      }

      const Html5Qrcode = (window as any).Html5Qrcode
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode('staffWebcamReaderBox')
      }

      setCamStatusText('Menghubungkan kamera...')
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          handleScanSubmit(decodedText)
          try {
            html5QrRef.current.pause()
            setTimeout(() => {
              try { html5QrRef.current.resume() } catch (e) {}
            }, 2000)
          } catch (e) {}
        },
        () => {}
      )

      setIsCamActive(true)
    } catch (err: any) {
      setIsCamActive(false)
      setCamStatusText('Gagal membuka kamera: ' + (err.message || 'Izin kamera ditolak'))
    }
  }

  async function stopCamera() {
    if (html5QrRef.current && isCamActive) {
      try {
        await html5QrRef.current.stop()
      } catch (e) {}
      setIsCamActive(false)
    }
  }

  function toggleCamMode() {
    if (isCamMode) {
      setIsCamMode(false)
      stopCamera()
    } else {
      setIsCamMode(true)
      startCamera()
    }
  }

  const totalKg = history.reduce((acc, item) => acc + (Number(item.weight) || 0), 0)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                Absen Buntelan Masuk Laundry
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>
                Pindai QR nota untuk absen pakaian masuk ke ruang cuci
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#F8FAFC',
                color: '#64748B',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid #E2E8F0',
              }}
              title="Tekan ESC untuk menutup"
            >
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Target Status Segmented Control */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#64748B',
                marginBottom: '8px',
              }}
            >
              Update Status Cucian Menjadi:
            </label>
            <div
              style={{
                display: 'flex',
                background: '#F1F5F9',
                borderRadius: '8px',
                padding: '3px',
                gap: '2px',
                border: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => setTargetStatus('received')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: targetStatus === 'received' ? '#FFFFFF' : 'transparent',
                  color: targetStatus === 'received' ? '#0F172A' : '#64748B',
                  boxShadow: targetStatus === 'received' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                1. Diterima Laundry
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('processing')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: targetStatus === 'processing' ? '#FFFFFF' : 'transparent',
                  color: targetStatus === 'processing' ? '#0F172A' : '#64748B',
                  boxShadow: targetStatus === 'processing' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                2. Langsung Dicuci
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('ready')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: targetStatus === 'ready' ? '#FFFFFF' : 'transparent',
                  color: targetStatus === 'ready' ? '#0F172A' : '#64748B',
                  boxShadow: targetStatus === 'ready' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                3. Siap Diambil
              </button>
            </div>
          </div>

          {/* Scanner Input */}
          <div style={{ marginBottom: '16px' }}>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleScanSubmit()
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="7" y1="8" x2="7" y2="16" />
                    <line x1="10" y1="8" x2="10" y2="16" />
                    <line x1="14" y1="8" x2="14" y2="16" />
                    <line x1="17" y1="8" x2="17" y2="16" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Tembakkan scanner ke QR nota atau ketik No. Transaksi..."
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 95px 0 44px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim()}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <span>{isSubmitting ? '...' : 'Scan'}</span>
                  <kbd style={{ background: 'rgba(255,255,255,0.22)', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '10px' }}>
                    ↵
                  </kbd>
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Input aktif &bull; Siap menerima sinyal scanner
              </span>
              <button
                type="button"
                onClick={toggleCamMode}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {isCamMode ? 'Tutup Kamera' : 'Gunakan Kamera Bawaan'}
              </button>
            </div>
          </div>

          {/* Camera View */}
          {isCamMode && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  background: '#0F172A',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div id="staffWebcamReaderBox" style={{ width: '100%', maxWidth: '380px', borderRadius: '8px', overflow: 'hidden' }} />
                {!isCamActive && (
                  <div style={{ color: '#94A3B8', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                    {camStatusText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Result Feedback */}
          {liveResult && (
            <div style={{ marginTop: '18px' }}>
              {liveResult.type === 'success' && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        background: '#16A34A',
                        color: '#fff',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#15803D', fontSize: '13.5px' }}>
                        {liveResult.message}
                      </div>
                      {liveResult.order && (
                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '3px' }}>
                          <strong>{liveResult.order.student_name}</strong> &bull; {liveResult.order.weight} kg &bull; No: {liveResult.order.transaction_id}
                        </div>
                      )}
                    </div>
                  </div>
                  {liveResult.order?.id && (
                    <Link
                      href={`/pesanan/${liveResult.order.id}`}
                      target="_blank"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563EB',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Detail →
                    </Link>
                  )}
                </div>
              )}

              {liveResult.type === 'info' && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        background: '#64748B',
                        color: '#fff',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      i
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                        {liveResult.message}
                      </div>
                      {liveResult.order && (
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          Santri: <strong>{liveResult.order.student_name}</strong> ({liveResult.order.weight} kg)
                        </div>
                      )}
                    </div>
                  </div>
                  {liveResult.order?.id && (
                    <Link
                      href={`/pesanan/${liveResult.order.id}`}
                      target="_blank"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563EB',
                        textDecoration: 'none',
                      }}
                    >
                      Detail →
                    </Link>
                  )}
                </div>
              )}

              {liveResult.type === 'error' && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </div>
                  <div style={{ fontWeight: 600, color: '#B91C1C', fontSize: '13px' }}>
                    {liveResult.message}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session History & Counter */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                Buntelan Masuk Sesi Ini:{' '}
                <span style={{ color: '#2563EB' }}>
                  {history.length} Buntelan ({totalKg.toFixed(1)} kg)
                </span>
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                background: '#FAFAFA',
              }}
            >
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                  Belum ada aktivitas scan pada sesi ini.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    style={{
                      padding: '9px 12px',
                      borderBottom: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FFFFFF',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.student_name}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>({item.weight} kg)</span>
                      <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '1px' }}>
                        {item.action_desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{item.time}</span>
                      <Link
                        href={`/pesanan/${item.id}`}
                        target="_blank"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#2563EB',
                          textDecoration: 'none',
                        }}
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Shortcut cepat: Tekan tombol <strong>S</strong> di keyboard kapan saja
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

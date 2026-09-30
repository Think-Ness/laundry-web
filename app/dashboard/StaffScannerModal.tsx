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
  const [mode, setMode] = useState<'gun' | 'cam'>('gun')
  const [targetStatus, setTargetStatus] = useState<'received' | 'processing' | 'ready'>('received')
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [liveResult, setLiveResult] = useState<{
    type: 'success' | 'error'
    message: string
    order?: any
  } | null>(null)
  const [history, setHistory] = useState<ScannedItem[]>([])
  const [isCamActive, setIsCamActive] = useState(false)
  const [camStatusText, setCamStatusText] = useState('Menginisialisasi kamera...')

  const inputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const html5QrRef = useRef<any>(null)

  // Cashier beep sound synth
  function playBeep(isSuccess = true) {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      if (isSuccess) {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime) // 880Hz (A5)
        gain.gain.setValueAtTime(0.18, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(320, ctx.currentTime)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.22)
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e)
    }
  }

  // Autofocus input when modal opens or mode changes to gun
  useEffect(() => {
    if (isOpen && mode === 'gun') {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, mode])

  // Cleanup camera when closing
  useEffect(() => {
    if (!isOpen && isCamActive) {
      stopCamera()
    }
  }, [isOpen, isCamActive])

  async function handleScanSubmit(codeToScan?: string) {
    const code = (codeToScan || inputValue).trim()
    if (!code || isSubmitting) return

    setIsSubmitting(true)
    setLiveResult(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, targetStatus }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        playBeep(true)
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
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          action_desc: data.action_desc,
        }

        setHistory(prev => [newItem, ...prev])
        if (onSuccessScan) onSuccessScan()
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
      if (mode === 'gun') {
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    }
  }

  // Camera integration with html5-qrcode
  async function startCamera() {
    try {
      setCamStatusText('Memuat scanner kamera...')

      // Load html5-qrcode dynamically if not loaded
      if (!(window as any).Html5Qrcode) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Gagal memuat pustaka html5-qrcode'))
          document.body.appendChild(script)
        })
      }

      const Html5Qrcode = (window as any).Html5Qrcode
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode('webcamReaderBox')
      }

      setCamStatusText('Menghubungkan ke kamera...')

      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          handleScanSubmit(decodedText)
          // Brief pause between scans
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
      console.error('Cam init error:', err)
      setIsCamActive(false)
      setCamStatusText('Gagal mengakses kamera: ' + (err.message || 'Periksa izin kamera'))
    }
  }

  async function stopCamera() {
    if (html5QrRef.current && isCamActive) {
      try {
        await html5QrRef.current.stop()
      } catch (e) {
        console.warn(e)
      }
      setIsCamActive(false)
      setCamStatusText('Kamera dinonaktifkan.')
    }
  }

  function handleModeChange(newMode: 'gun' | 'cam') {
    setMode(newMode)
    if (newMode === 'cam') {
      startCamera()
    } else {
      stopCamera()
    }
  }

  const totalKg = history.reduce((acc, item) => acc + (Number(item.weight) || 0), 0)

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
                <line x1="7" y1="12" x2="17" y2="12" strokeDasharray="2 2" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Absen Buntelan Masuk (Staf Laundry)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                Scan QR nota untuk ceklis pakaian masuk ke ruang laundry
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#E2E8F0',
                color: '#475569',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 7px',
                borderRadius: '5px',
                border: '1px solid #CBD5E1',
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
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Target Status Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Update Status Cucian Menjadi:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTargetStatus('received')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: targetStatus === 'received' ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
                  background: targetStatus === 'received' ? '#EFF6FF' : '#F8FAFC',
                  color: targetStatus === 'received' ? '#1D4ED8' : '#475569',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                1. Diterima Laundry (Antrean)
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('processing')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: targetStatus === 'processing' ? '1.5px solid #F59E0B' : '1.5px solid #E2E8F0',
                  background: targetStatus === 'processing' ? '#FFFBEB' : '#F8FAFC',
                  color: targetStatus === 'processing' ? '#B45309' : '#475569',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                2. Langsung Dicuci (Proses)
              </button>
              <button
                type="button"
                onClick={() => setTargetStatus('ready')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: targetStatus === 'ready' ? '1.5px solid #10B981' : '1.5px solid #E2E8F0',
                  background: targetStatus === 'ready' ? '#ECFDF5' : '#F8FAFC',
                  color: targetStatus === 'ready' ? '#047857' : '#475569',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                3. Siap Diambil Stand
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: '10px',
              padding: '4px',
              gap: '4px',
              marginBottom: '14px',
            }}
          >
            <button
              type="button"
              onClick={() => handleModeChange('gun')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '7px',
                background: mode === 'gun' ? '#FFFFFF' : 'transparent',
                color: mode === 'gun' ? '#0F172A' : '#64748B',
                boxShadow: mode === 'gun' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              Scanner Kasir / Gun (USB/Bluetooth)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('cam')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '7px',
                background: mode === 'cam' ? '#FFFFFF' : 'transparent',
                color: mode === 'cam' ? '#0F172A' : '#64748B',
                boxShadow: mode === 'cam' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Kamera Bawaan (Webcam)
            </button>
          </div>

          {/* Gun Mode Input */}
          {mode === 'gun' && (
            <div>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleScanSubmit()
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
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
                    placeholder="Tembakkan scanner ke QR nota atau ketik No. Transaksi lalu tekan Enter..."
                    disabled={isSubmitting}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={{
                      width: '100%',
                      padding: '14px 105px 14px 46px',
                      border: '2px solid #2563EB',
                      borderRadius: '10px',
                      fontSize: '14px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none',
                      boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.12)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputValue.trim()}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '7px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    <span>{isSubmitting ? 'Memproses...' : 'Scan'}</span>
                    <kbd style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px' }}>
                      ↵ Enter
                    </kbd>
                  </button>
                </div>
              </form>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Input standby &bull; Scan berturut-turut tanpa jeda
                </span>
                <span>Shortcut: Tekan <strong>S</strong> kapan saja</span>
              </div>
            </div>
          )}

          {/* Camera View */}
          {mode === 'cam' && (
            <div>
              <div
                style={{
                  background: '#0F172A',
                  borderRadius: '12px',
                  padding: '12px',
                  minHeight: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div id="webcamReaderBox" style={{ width: '100%', maxWidth: '420px', borderRadius: '8px', overflow: 'hidden' }} />
                {!isCamActive && (
                  <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                    {camStatusText}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={isCamActive ? stopCamera : startCamera}
                  style={{
                    background: isCamActive ? '#EF4444' : '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isCamActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                </button>
              </div>
            </div>
          )}

          {/* Live Result Notification */}
          {liveResult && (
            <div style={{ marginTop: '16px' }}>
              {liveResult.type === 'success' ? (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #22C55E',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        background: '#22C55E',
                        color: '#fff',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '14px',
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#15803D', fontSize: '14px' }}>
                        {liveResult.message}
                      </div>
                      {liveResult.order && (
                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '3px' }}>
                          <strong>{liveResult.order.student_name}</strong> &bull; {liveResult.order.weight} kg &bull;
                          No. Transaksi: {liveResult.order.transaction_id}
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
                        textDecoration: 'underline',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Lihat Pesanan →
                    </Link>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1.5px solid #EF4444',
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
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '13px',
                    }}
                  >
                    ✕
                  </div>
                  <div style={{ fontWeight: 600, color: '#B91C1C', fontSize: '13.5px' }}>
                    {liveResult.message}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session History & Counter */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                Buntelan Masuk Sesi Ini:{' '}
                <span style={{ color: '#2563EB' }}>
                  {history.length} Buntelan ({totalKg.toFixed(1)} kg)
                </span>
              </div>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                  Belum ada buntelan yang di-absen pada sesi ini. Tembakkan scanner kasir ke QR nota cucian.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>
                        {item.student_name}{' '}
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>
                          ({item.transaction_id})
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        {item.weight} kg &bull;{' '}
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>{item.action_desc}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{item.time}</span>
                      <Link
                        href={`/pesanan/${item.id}`}
                        target="_blank"
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#2563EB',
                          background: '#EFF6FF',
                          borderRadius: '6px',
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
            padding: '12px 20px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Scanner barcode otomatis mengirim Enter setelah kode terbaca
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

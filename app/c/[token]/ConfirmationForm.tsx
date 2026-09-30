'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QrPayload } from '@/lib/qr-verifier'

export interface OrderInfo {
  id: string
  transaction_id: string
  status: string
  payment_status?: string | null
  payment_proof_url?: string | null
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
  { key: 'received', label: 'Diterima Laundry', desc: 'Pakaian fisik telah diterima petugas laundry' },
  { key: 'processing', label: 'Sedang Dicuci', desc: 'Pakaian dalam proses pencucian & pengeringan' },
  { key: 'ready', label: 'Siap Diambil', desc: 'Cucian selesai disetrika rapi & siap diambil di counter' },
]

const STATUS_ORDER = ['new', 'received', 'processing', 'ready']

function getStepIndex(status: string) {
  if (status === 'completed' || status === 'ready') return 3
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

export default function ConfirmationForm({ payload, token, initialOrder }: Props) {
  const [note, setNote] = useState(initialOrder?.customer_note || '')
  const [order, setOrder] = useState<OrderInfo | null>(initialOrder)
  const [state, setState] = useState<State>(initialOrder ? 'already_submitted' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Payment proof states
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(initialOrder?.payment_proof_url || null)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const [proofUploadSuccess, setProofUploadSuccess] = useState(false)
  const [proofUploadError, setProofUploadError] = useState('')
  const [showProofModal, setShowProofModal] = useState(false)

  const router = useRouter()

  const isTransferOrQris = payload.bayar === 'transfer' || payload.bayar === 'qris' || !payload.lunas

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
    setProofUploadSuccess(false)
    setProofUploadError('')
  }

  // Upload proof directly (when order already submitted or standalone)
  async function handleDirectUpload(selectedFile?: File) {
    const targetFile = selectedFile || proofFile
    if (!targetFile) return

    setIsUploadingProof(true)
    setProofUploadError('')
    setProofUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', targetFile)
      formData.append('transaction_id', payload.id)
      if (order?.id) {
        formData.append('order_id', order.id)
      }

      const res = await fetch('/api/upload-proof', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.proof_url) {
        setProofPreview(data.proof_url)
        setProofUploadSuccess(true)
        if (order) {
          setOrder({ ...order, payment_proof_url: data.proof_url, payment_status: 'verification' })
        }
        router.refresh()
      } else {
        setProofUploadError(data.message || 'Gagal mengunggah bukti pembayaran.')
      }
    } catch {
      setProofUploadError('Koneksi terputus saat mengunggah. Silakan coba lagi.')
    } finally {
      setIsUploadingProof(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || state === 'success') return

    setState('loading')
    setErrorMsg('')

    try {
      let uploadedProofUrl: string | undefined = undefined

      // If user selected a proof file, upload it first
      if (proofFile) {
        try {
          const formData = new FormData()
          formData.append('file', proofFile)
          formData.append('transaction_id', payload.id)
          const upRes = await fetch('/api/upload-proof', {
            method: 'POST',
            body: formData,
          })
          if (upRes.ok) {
            const upJson = await upRes.json()
            uploadedProofUrl = upJson.proof_url
          }
        } catch (upErr) {
          console.warn('Proof pre-upload failed, proceeding with confirmation:', upErr)
        }
      }

      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          note,
          payment_proof_url: uploadedProofUrl,
        }),
      })

      const data = await res.json()

      if (res.status === 200 || res.status === 201) {
        setState('success')
        setOrder({
          id: data.order_id || 'new',
          transaction_id: payload.id,
          status: 'new',
          payment_status: uploadedProofUrl ? 'verification' : payload.lunas ? 'paid' : 'pending',
          payment_proof_url: uploadedProofUrl || null,
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
          payment_proof_url: uploadedProofUrl || null,
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
  const activeProofUrl = order?.payment_proof_url || proofPreview

  // ─────────────────────────────────────────────────────────────────────────────
  // View 1: Already Submitted -> Progress Stepper & Proof Viewer
  // ─────────────────────────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div style={{ width: '100%' }}>
        {/* Status Alert Banner */}
        <div style={{
          background: state === 'success' ? '#DCFCE7' : '#EFF6FF',
          border: state === 'success' ? '1px solid #BBF7D0' : '1px solid #DBEAFE',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: state === 'success' ? '#16A34A' : '#2563EB',
              color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: state === 'success' ? '#15803D' : '#1E40AF',
              }}>
                {state === 'success' ? 'Laundry Berhasil Dikirim!' : 'Pesanan Sudah Dikonfirmasi'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                Status cucian dipantau langsung di bawah ini
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            title="Muat ulang status terbaru"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#334155',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: '12px',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                PROGRES PENGERJAAN
              </div>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', fontWeight: 600 }}>
                Status:{' '}
                <span style={{ color: isCompleted ? '#16A34A' : isCancelled ? '#DC2626' : '#2563EB' }}>
                  {STATUS_STEPS[currentStepIndex]?.label || currentStatus}
                </span>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#EFF6FF', color: '#1D4ED8',
              border: '1px solid #DBEAFE',
              borderRadius: '999px', fontSize: '11px', fontWeight: 600,
              padding: '3px 10px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }}/>
              Live Tracking
            </div>
          </div>

          {/* Banner ready / completed */}
          {currentStatus === 'ready' && (
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>🎉</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                  Cucian Selesai &amp; Siap Diambil!
                </div>
                <div style={{ fontSize: '11.5px', color: '#1E3A8A', marginTop: '2px' }}>
                  Pakaian telah selesai dicuci dan disetrika rapi. Silakan ambil di counter laundry pondok.
                </div>
              </div>
            </div>
          )}

          {currentStatus === 'completed' && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803D' }}>
                  Pesanan Telah Selesai
                </div>
                <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '2px' }}>
                  Cucian telah diambil &amp; diserahkan kepada santri. Terima kasih telah menggunakan Latansa Laundry.
                </div>
              </div>
            </div>
          )}

          {/* Stepper Timeline */}
          {!isCancelled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {STATUS_STEPS.map((step, idx) => {
                const isStepFinished = (currentStatus === 'ready' || isCompleted)
                  ? true
                  : idx < currentStepIndex
                const isStepActive = (currentStatus === 'ready' || isCompleted)
                  ? idx === 3
                  : idx === currentStepIndex
                const isStepFuture = !isStepFinished && !isStepActive

                return (
                  <div key={step.key} style={{ display: 'flex', position: 'relative', minHeight: '56px' }}>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '15px',
                        top: '32px',
                        bottom: '-2px',
                        width: '2px',
                        backgroundColor: isStepFinished ? '#16A34A' : '#E2E8F0',
                        zIndex: 0,
                      }}/>
                    )}

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isStepFinished ? '#16A34A' : isStepActive ? '#2563EB' : '#F1F5F9',
                      border: isStepFinished ? '2px solid #16A34A' : isStepActive ? '2px solid #2563EB' : '2px solid #CBD5E1',
                      color: isStepFinished || isStepActive ? '#FFFFFF' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      zIndex: 1,
                      flexShrink: 0,
                      boxShadow: isStepActive ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                    }}>
                      {isStepFinished ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div style={{ marginLeft: '14px', flex: 1, paddingBottom: '20px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isStepFinished ? '#15803D' : isStepActive ? '#2563EB' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        {step.label}
                        {isStepActive && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: currentStatus === 'ready' || isCompleted ? '#DCFCE7' : '#EFF6FF',
                            color: currentStatus === 'ready' || isCompleted ? '#15803D' : '#2563EB',
                            border: currentStatus === 'ready' || isCompleted ? '1px solid #BBF7D0' : '1px solid #BFDBFE',
                          }}>
                            {currentStatus === 'ready' || isCompleted ? 'SELESAI' : 'PROSES SAAT INI'}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '11.5px',
                        color: isStepActive ? '#334155' : '#94A3B8',
                        marginTop: '2px',
                        lineHeight: 1.4,
                      }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '12px',
              color: '#DC2626',
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
              borderTop: '1px solid #F1F5F9',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.02em', marginBottom: '4px' }}>
                CATATAN ANDA
              </div>
              <div style={{
                fontSize: '12.5px',
                color: '#334155',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 12px',
              }}>
                {order?.customer_note || note}
              </div>
            </div>
          )}
        </div>

        {/* Payment Proof Card in Tracking View */}
        {isTransferOrQris && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '16px',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                  BUKTI PEMBAYARAN ({payload.bayar === 'transfer' ? 'TRANSFER BANK' : 'QRIS'})
                </div>
                <div style={{ fontSize: '12.5px', color: '#0F172A', marginTop: '2px', fontWeight: 600 }}>
                  Status Bayar:{' '}
                  <span style={{ color: (order?.payment_status === 'paid' || payload.lunas) ? '#16A34A' : activeProofUrl ? '#2563EB' : '#EA580C' }}>
                    {(order?.payment_status === 'paid' || payload.lunas)
                      ? 'Lunas'
                      : activeProofUrl
                      ? 'Menunggu Verifikasi Laundry'
                      : 'Belum Bayar / Belum Ada Bukti'}
                  </span>
                </div>
              </div>

              <span style={{
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                background: activeProofUrl ? '#EFF6FF' : '#FFF7ED',
                color: activeProofUrl ? '#1D4ED8' : '#C2410C',
                border: activeProofUrl ? '1px solid #BFDBFE' : '1px solid #FFEDD5',
              }}>
                {activeProofUrl ? 'Bukti Terunggah' : 'Perlu Bukti'}
              </span>
            </div>

            {activeProofUrl ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#F8FAFC', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <img
                  src={activeProofUrl}
                  alt="Bukti Pembayaran"
                  onClick={() => setShowProofModal(true)}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                    Bukti Pembayaran Terkirim
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Petugas laundry akan memeriksa &amp; memvalidasi transaksi Anda.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowProofModal(true)}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1D4ED8',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Lihat Foto
                    </button>
                    <label style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      Ganti Foto
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleDirectUpload(f)
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px', lineHeight: 1.4 }}>
                  Silakan unggah screenshot atau foto bukti transaksi agar langsung tersampaikan ke petugas laundry.
                </p>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #93C5FD',
                  background: '#EFF6FF',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: isUploadingProof ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D4ED8' }}>
                    {isUploadingProof ? 'Sedang Mengunggah...' : 'Pilih Foto / Screenshot Bukti Bayar'}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                    JPG, PNG, atau WEBP (Maksimal 8MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingProof}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleDirectUpload(f)
                    }}
                  />
                </label>
              </div>
            )}

            {proofUploadSuccess && (
              <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#15803D', background: '#DCFCE7', padding: '6px 10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                Bukti pembayaran berhasil diunggah dan terkirim ke sistem laundry!
              </div>
            )}
            {proofUploadError && (
              <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#DC2626', background: '#FEE2E2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                {proofUploadError}
              </div>
            )}
          </div>
        )}

        <div style={{
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#64748B',
          lineHeight: 1.6,
          padding: '0 8px',
        }}>
          Simpan nota ini. Anda dapat memindai kembali QR code kapan saja untuk memeriksa status pengerjaan cucian santri.
        </div>

        {/* Modal Full Image Preview */}
        {showProofModal && activeProofUrl && (
          <div
            onClick={() => setShowProofModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '480px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Foto Bukti Pembayaran</div>
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  style={{
                    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B'
                  }}
                >
                  ✕
                </button>
              </div>
              <img
                src={activeProofUrl}
                alt="Bukti Transfer"
                style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #E2E8F0' }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // View 2: Initial Confirmation Form (Before Submit)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Upload Bukti Pembayaran Box (Only if Transfer, QRIS, or unpaid) */}
      {isTransferOrQris && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '18px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        }}>
          <label style={{
            display: 'block',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#1E40AF',
            marginBottom: '4px',
            letterSpacing: '0.02em',
          }}>
            UPLOAD BUKTI PEMBAYARAN ({payload.bayar === 'transfer' ? 'TRANSFER BANK' : 'QRIS'})
          </label>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', lineHeight: 1.4 }}>
            Silakan unggah foto atau screenshot bukti transfer / struk QRIS Anda agar dapat diverifikasi oleh bagian laundry pondok.
          </p>

          {proofPreview ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 12px',
            }}>
              <img
                src={proofPreview}
                alt="Preview Bukti"
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  {proofFile ? proofFile.name : 'Bukti Pembayaran Terpilih'}
                </div>
                <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px', fontWeight: 500 }}>
                  Foto siap dikirim bersama pesanan
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null)
                    setProofPreview(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '11px',
                    color: '#DC2626',
                    cursor: 'pointer',
                    marginTop: '4px',
                    textDecoration: 'underline',
                  }}
                >
                  Hapus / Pilih Ulang
                </button>
              </div>
            </div>
          ) : (
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #93C5FD',
              background: '#EFF6FF',
              borderRadius: '10px',
              padding: '18px 14px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'background 0.15s ease',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D4ED8' }}>
                Pilih Foto / Screenshot Bukti Bayar
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                Kamera atau Galeri (JPG, PNG, WEBP)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      )}

      {/* Note Input */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      }}>
        <label style={{
          display: 'block',
          fontSize: '11.5px',
          fontWeight: 600,
          color: '#475569',
          marginBottom: '8px',
          letterSpacing: '0.02em',
        }}>
          CATATAN TAMBAHAN UNTUK PETUGAS
          <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: '6px' }}>(opsional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'none',
          }}
          placeholder="Contoh: baju putih jangan dicampur, ada baju batik, mohon setrika licin..."
          disabled={state === 'loading'}
        />
        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '5px', textAlign: 'right' }}>
          {note.length}/500
        </div>
      </div>

      {state === 'error' && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '12px 14px',
          color: '#DC2626',
          fontSize: '12.5px',
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
          padding: '12px',
          borderRadius: '10px',
          background: state === 'loading' ? '#93C5FD' : '#2563EB',
          color: '#FFFFFF',
          fontSize: '13.5px',
          fontWeight: 600,
          border: 'none',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background-color 0.15s',
        }}
      >
        {state === 'loading' ? (
          <>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
            </svg>
            Mengirim Data &amp; Bukti...
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
        fontSize: '11.5px',
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

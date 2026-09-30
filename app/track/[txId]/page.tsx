import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'

interface Props {
  params: Promise<{ txId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { txId } = await params
  return {
    title: `Status Laundry ${decodeURIComponent(txId)} — Latansa Laundry`,
    description: 'Pantau status laundry Anda secara real-time',
  }
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: 'new', label: 'Pesanan Diterima', desc: 'Laundry Anda sudah terdaftar di sistem stand' },
  { key: 'received', label: 'Diterima Laundry', desc: 'Pakaian fisik telah diterima oleh petugas laundry' },
  { key: 'processing', label: 'Sedang Dicuci', desc: 'Pakaian sedang dalam proses pencucian & pengeringan' },
  { key: 'ready', label: 'Siap Diambil', desc: 'Laundry selesai disetrika, rapi & siap diambil' },
  { key: 'completed', label: 'Selesai', desc: 'Laundry telah diserahkan kembali' },
]

const STATUS_ORDER = ['new', 'received', 'processing', 'ready', 'completed']

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

export default async function TrackPage({ params }: Props) {
  const { txId } = await params
  const transactionId = decodeURIComponent(txId).toUpperCase()

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, transaction_id, customer_name, student_name, student_reg_number, service_type, weight, total_amount, payment_method, payment_status, status, submitted_at, received_at, processing_at, completed_at, customer_note, created_at')
    .eq('transaction_id', transactionId)
    .single()

  if (!order) notFound()

  const { data: events } = await supabase
    .from('order_events')
    .select('id, description, created_at, event_type')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  const currentStepIndex = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled'
  const isCompleted = order.status === 'completed'

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#0F172A',
      paddingBottom: '48px',
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
            <div style={{ fontSize: '10px', color: '#64748B' }}>Pelacakan Status Laundry</div>
          </div>
        </div>

        <Link
          href="/track"
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
          Cari Nota Lain
        </Link>
      </div>

      <div style={{ maxWidth: '460px', margin: '0 auto', padding: '20px 16px 0' }}>

        {/* Transaction Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
            NOMOR TRANSAKSI
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
            {order.transaction_id}
          </div>
        </div>

        {/* Customer Info Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '18px',
          marginBottom: '16px',
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', marginBottom: '12px' }}>
            DATA PESANAN
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <InfoRow label="Nama Santri" value={order.student_name} bold />
            <InfoRow label="Nama Wali" value={order.customer_name} />
            {order.student_reg_number && <InfoRow label="NIS / No. Reg" value={order.student_reg_number} mono />}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginTop: '2px', display: 'grid', gap: '8px' }}>
              <InfoRow label="Layanan" value={(order.service_type ?? 'Reguler').toUpperCase()} />
              <InfoRow label="Berat" value={`${Number(order.weight).toFixed(1)} Kg`} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '10px',
                padding: '9px 12px',
                marginTop: '4px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>Total Biaya</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1D4ED8' }}>
                  Rp {Number(order.total_amount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        {!isCancelled ? (
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
                  <span style={{ color: isCompleted ? '#16A34A' : '#2563EB' }}>
                    {STATUS_STEPS[currentStepIndex]?.label || order.status}
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
                        width: '30px', height: '30px',
                        borderRadius: '50%',
                        background: done ? '#16A34A' : active ? '#2563EB' : '#F1F5F9',
                        border: active ? '3px solid #DBEAFE' : done ? 'none' : '1px solid #CBD5E1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: done || active ? '#FFFFFF' : '#94A3B8',
                        flexShrink: 0,
                      }}>
                        {done ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : active ? (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} />
                        ) : (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
                        )}
                      </div>
                      {!isLast && (
                        <div style={{
                          width: '2px',
                          flex: 1,
                          minHeight: '22px',
                          background: done ? '#16A34A' : '#E2E8F0',
                          margin: '3px 0',
                        }} />
                      )}
                    </div>

                    {/* Step details */}
                    <div style={{
                      paddingBottom: isLast ? '0' : '16px',
                      paddingTop: '3px',
                    }}>
                      <div style={{
                        fontSize: '13.5px',
                        fontWeight: active ? 700 : done ? 600 : 500,
                        color: done ? '#15803D' : active ? '#0F172A' : '#64748B',
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: '11.5px', color: pending ? '#94A3B8' : '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                        {step.desc}
                      </div>
                      {active && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: '#EFF6FF', color: '#1D4ED8',
                          border: '1px solid #DBEAFE',
                          borderRadius: '6px', fontSize: '10.5px', fontWeight: 600,
                          padding: '2px 8px', marginTop: '5px',
                        }}>
                          Sedang Berlangsung
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px',
            color: '#DC2626',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Pesanan ini telah dibatalkan.
          </div>
        )}

        {/* Customer Note */}
        {order.customer_note && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.02em', marginBottom: '6px' }}>
              CATATAN DARI WALI SANTRI
            </div>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#334155',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px 12px',
              lineHeight: 1.5,
            }}>
              {order.customer_note}
            </p>
          </div>
        )}

        {/* Activity Timeline */}
        {events && events.length > 0 && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '16px',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', marginBottom: '12px' }}>
              RIWAYAT AKTIVITAS
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {events.map((ev: any) => (
                <div key={ev.id} style={{
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#334155', fontWeight: 500 }}>{ev.description}</span>
                  <span style={{ color: '#94A3B8', fontSize: '10.5px', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                    {new Date(ev.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#64748B',
          lineHeight: 1.6,
          padding: '0 8px',
        }}>
          💡 Buka kembali link ini sewaktu-waktu untuk melihat status terbaru cucian Anda.
        </div>
      </div>
    </main>
  )
}

function InfoRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ fontSize: '12.5px', color: '#64748B', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '13px',
        fontWeight: bold ? 700 : 500,
        color: bold ? '#0F172A' : '#334155',
        textAlign: 'right',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}

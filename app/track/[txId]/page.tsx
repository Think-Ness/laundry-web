import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
  { key: 'new', label: 'Pesanan Diterima', desc: 'Laundry anda sudah terdaftar di sistem' },
  { key: 'received', label: 'Diterima Laundry', desc: 'Buntelan diterima oleh petugas laundry' },
  { key: 'processing', label: 'Sedang Dicuci', desc: 'Pakaian sedang dalam proses pencucian' },
  { key: 'ready', label: 'Siap Diambil', desc: 'Laundry selesai dan siap diserahkan' },
  { key: 'completed', label: 'Selesai', desc: 'Laundry telah diserahkan ke wali santri' },
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
    .select('id, transaction_id, customer_name, student_name, student_reg_number, service_type, weight, total_amount, payment_method, status, submitted_at, received_at, processing_at, completed_at, created_at')
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
      background: 'linear-gradient(160deg, #0D1929 0%, #0F172A 60%, #111827 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '0',
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '30px', height: '30px',
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="4"/>
            <circle cx="12" cy="13" r="4"/>
            <path d="M6 6h.01M9 6h3"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>Latansa Laundry</div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>Tracking Status Laundry</div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Transaction Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, letterSpacing: '0.07em', marginBottom: '6px' }}>
            NO. TRANSAKSI
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F1F5F9', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {order.transaction_id}
          </div>
          <div style={{ marginTop: '8px' }}>
            <StatusBadge status={order.status as OrderStatus} large />
          </div>
        </div>

        {/* Customer Info Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', marginBottom: '12px' }}>
            DATA LAUNDRY
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <InfoRow label="Nama Wali Santri" value={order.customer_name} />
            <InfoRow label="Nama Santri" value={order.student_name} />
            {order.student_reg_number && <InfoRow label="NIS / No. Reg" value={order.student_reg_number} mono />}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
              <InfoRow label="Layanan" value={(order.service_type ?? 'Reguler').toUpperCase()} />
              <div style={{ marginTop: '8px' }}>
                <InfoRow label="Berat" value={`${Number(order.weight).toFixed(1)} kg`} />
              </div>
              <div style={{ marginTop: '8px' }}>
                <InfoRow label="Total" value={`Rp ${Number(order.total_amount).toLocaleString('id-ID')}`} highlight />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        {!isCancelled ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', marginBottom: '16px' }}>
              PROGRES PENGERJAAN
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStepIndex
                const active = i === currentStepIndex
                const pending = i > currentStepIndex
                const isLast = i === STATUS_STEPS.length - 1

                return (
                  <div key={step.key} style={{ display: 'flex', gap: '14px' }}>
                    {/* Step indicator + connector */}
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
                          minHeight: '20px',
                          background: done ? '#16A34A' : 'rgba(255,255,255,0.08)',
                          margin: '4px 0',
                        }} />
                      )}
                    </div>

                    {/* Step content */}
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
                      <div style={{ fontSize: '11.5px', color: pending ? '#334155' : '#64748B', marginTop: '2px' }}>
                        {step.desc}
                      </div>
                      {active && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: 'rgba(59,130,246,0.15)', color: '#60A5FA',
                          border: '1px solid rgba(59,130,246,0.25)',
                          borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', marginTop: '5px',
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
                          SEDANG BERLANGSUNG
                        </div>
                      )}
                      {isCompleted && done && step.key === 'completed' && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: 'rgba(22,163,74,0.15)', color: '#4ADE80',
                          border: '1px solid rgba(22,163,74,0.25)',
                          borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', marginTop: '5px',
                        }}>
                          ✓ SELESAI
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
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#F87171', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
              Pesanan Dibatalkan
            </div>
            <div style={{ color: '#94A3B8', fontSize: '12px' }}>
              Pesanan ini telah dibatalkan. Silakan hubungi petugas laundry.
            </div>
          </div>
        )}

        {/* Timeline Events */}
        {events && events.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', marginBottom: '14px' }}>
              RIWAYAT AKTIVITAS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {events.map((event, i) => (
                <div key={event.id} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: i === events.length - 1 ? '#3B82F6' : '#334155',
                      flexShrink: 0, marginTop: '4px',
                    }} />
                    {i < events.length - 1 && (
                      <div style={{ width: '1px', flex: 1, minHeight: '16px', background: 'rgba(255,255,255,0.05)', margin: '3px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < events.length - 1 ? '10px' : '0' }}>
                    <div style={{ fontSize: '12.5px', color: '#CBD5E1', fontWeight: 500 }}>{event.description}</div>
                    <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '1px' }}>
                      {new Date(event.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '24px' }}>
          Latansa Laundry · Sistem Laundry Santri Digital
          <br />
          <span style={{ fontSize: '10px', color: '#1E293B' }}>
            Halaman ini dapat diakses kembali kapan saja melalui QR code pada nota Anda
          </span>
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      `}</style>
    </main>
  )
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: '#64748B', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '12.5px',
        fontWeight: highlight ? 700 : 600,
        color: highlight ? '#60A5FA' : '#E2E8F0',
        fontFamily: mono ? 'monospace' : 'inherit',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status, large }: { status: OrderStatus; large?: boolean }) {
  const label = ORDER_STATUS_LABELS[status] ?? status
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    new:        { bg: 'rgba(37,99,235,0.15)', color: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
    received:   { bg: 'rgba(79,70,229,0.15)', color: '#A5B4FC', border: 'rgba(99,102,241,0.3)' },
    processing: { bg: 'rgba(234,88,12,0.15)', color: '#FB923C', border: 'rgba(249,115,22,0.3)' },
    ready:      { bg: 'rgba(22,163,74,0.15)', color: '#4ADE80', border: 'rgba(34,197,94,0.3)' },
    completed:  { bg: 'rgba(22,163,74,0.15)', color: '#4ADE80', border: 'rgba(34,197,94,0.3)' },
    cancelled:  { bg: 'rgba(220,38,38,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.3)' },
    waiting_confirmation: { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8', border: 'rgba(100,116,139,0.3)' },
  }
  const s = styles[status] ?? styles.waiting_confirmation
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: large ? '5px 14px' : '2px 10px',
      borderRadius: '999px',
      fontSize: large ? '13px' : '11px',
      fontWeight: 700,
    }}>
      {label}
    </span>
  )
}

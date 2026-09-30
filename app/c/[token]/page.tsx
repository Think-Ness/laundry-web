import { notFound } from 'next/navigation'
import { decodeQrToken, verifyQrSignature, formatRupiah } from '@/lib/qr-verifier'
import { createServiceClient } from '@/lib/supabase/server'
import ConfirmationForm, { type OrderInfo } from './ConfirmationForm'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const payload = decodeQrToken(token)
  const title = payload?.id
    ? `Pesanan ${payload.id} — Latansa Laundry`
    : 'Konfirmasi Laundry — Latansa Laundry'
  return {
    title,
    description: 'Konfirmasi dan pantau progres pengerjaan laundry santri.',
  }
}

export default async function ConfirmationPage({ params }: Props) {
  const { token } = await params

  // 1. Decode and verify QR payload
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
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0D1929 0%, #0F172A 60%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '16px',
          padding: '28px 20px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '12px',
            background: 'rgba(239,68,68,0.15)',
            color: '#F87171',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#F87171', margin: '0 0 8px' }}>
            QR Code Tidak Valid
          </h1>
          <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
            QR Code ini tidak dapat diverifikasi keasliannya. Pastikan Anda memindai QR langsung dari nota resmi.
          </p>
          <div style={{
            marginTop: '16px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#64748B',
            fontFamily: 'monospace',
          }}>
            ID: {payload.id}
          </div>
        </div>
      </main>
    )
  }

  // 2. Query Supabase to see if this order already exists
  let existingOrder: OrderInfo | null = null
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('orders')
      .select('id, transaction_id, status, submitted_at, received_at, processing_at, completed_at, customer_note, created_at, updated_at')
      .eq('transaction_id', payload.id)
      .maybeSingle()

    if (data) {
      existingOrder = data as OrderInfo
    }
  } catch (err) {
    console.error('Failed to check existing order in Supabase:', err)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0D1929 0%, #0F172A 60%, #111827 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#F1F5F9',
      paddingBottom: '48px',
    }}>
      {/* Top Header Bar */}
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
            <div style={{ fontSize: '10px', color: '#64748B' }}>
              {existingOrder ? 'Progres Status Laundry' : 'Konfirmasi Penerimaan Laundry'}
            </div>
          </div>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '999px',
          background: existingOrder ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
          color: existingOrder ? '#4ADE80' : '#FDE047',
          border: existingOrder ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(234,179,8,0.3)',
        }}>
          {existingOrder ? 'Sudah Disubmit' : 'Siap Kirim'}
        </span>
      </div>

      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 16px 0' }}>

        {/* Transaction Header */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', marginBottom: '4px' }}>
            NO. TRANSAKSI
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#F8FAFC', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {payload.id}
          </div>
        </div>

        {/* Data Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', marginBottom: '12px' }}>
            RINCIAN PESANAN
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <DataRow label="Nama Santri" value={payload.santri} bold />
            <DataRow label="Nama Wali" value={payload.wali} />
            {payload.nis && <DataRow label="NIS / No. Reg" value={payload.nis} mono />}
            {payload.hp && <DataRow label="No. HP" value={payload.hp} />}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px', marginTop: '2px', display: 'grid', gap: '8px' }}>
              {payload.layanan && (
                <DataRow label="Tipe Layanan" value={payload.layanan.toUpperCase()} />
              )}
              <DataRow label="Berat Cucian" value={`${payload.kg.toFixed(1)} Kg`} />
              <DataRow label="Tarif / Kg" value={formatRupiah(payload.harga)} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.18)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginTop: '4px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#93C5FD' }}>Total Bayar</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#60A5FA' }}>{formatRupiah(payload.total)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                <span>Metode: <strong style={{ color: '#E2E8F0' }}>{payload.bayar === 'qris' ? 'QRIS' : 'Cash'}</strong></span>
                <span>Status: <strong style={{ color: payload.lunas ? '#4ADE80' : '#FDE047' }}>{payload.lunas ? 'Lunas' : 'Belum Lunas'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Form or Progress Stepper */}
        <ConfirmationForm
          payload={payload}
          token={token}
          initialOrder={existingOrder}
        />
      </div>
    </main>
  )
}

function DataRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{ fontSize: '12.5px', color: '#94A3B8', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '13px',
        fontWeight: bold ? 700 : 500,
        color: bold ? '#F8FAFC' : '#CBD5E1',
        textAlign: 'right',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}

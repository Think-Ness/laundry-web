import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Pengaturan — Latansa Laundry',
}

export default async function PengaturanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-subtitle">Informasi sistem dan konfigurasi Latansa Laundry</p>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', marginBottom: '24px' }}>
        <InfoBlock label="Nama Usaha" value="Latansa Laundry" accent="#2563EB" />
        <InfoBlock label="Platform" value="Laundry Santri Digital" accent="#8B5CF6" />
        <InfoBlock label="Cloud Engine" value="Supabase PostgreSQL" accent="#10B981" />
        <InfoBlock label="Integrasi Kasir" value="HMAC-SHA256 QR Bridge" accent="#F59E0B" />
      </div>

      {/* Akun Staf */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A', margin: 0 }}>
              Akun Staf & Pengelola
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0' }}>
              Semua akun yang memiliki akses ke sistem ini
            </p>
          </div>
          <span style={{
            background: '#EFF6FF', color: '#2563EB',
            padding: '4px 12px', borderRadius: '999px',
            fontSize: '12px', fontWeight: 700,
          }}>
            {profiles?.length ?? 0} Akun
          </span>
        </div>

        <div>
          {profiles?.map((p: {
            id: string; name?: string; email?: string; role?: string
          }) => (
            <div key={p.id} style={{
              padding: '14px 20px',
              borderBottom: '1px solid #F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#2563EB',
                  flexShrink: 0,
                }}>
                  {(p.name || p.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0F172A' }}>
                    {p.name || 'Pengguna'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                    {p.email}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#F5F3FF', color: '#7C3AED',
                  padding: '3px 10px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                }}>
                  {p.role ?? 'staff'}
                </span>
                <span style={{
                  background: '#F0FDF4', color: '#16A34A',
                  padding: '3px 10px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 600,
                }}>
                  Aktif
                </span>
              </div>
            </div>
          ))}
          {(!profiles || profiles.length === 0) && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              Belum ada akun terdaftar
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #F0F7FF 0%, #EFF6FF 100%)',
        border: '1px solid #BFDBFE',
        borderRadius: '14px',
        padding: '18px 20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: '36px', height: '36px', flexShrink: 0,
          background: '#DBEAFE', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#2563EB',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E40AF', marginBottom: '4px' }}>
            Pengelolaan Akun Staf
          </div>
          <p style={{ fontSize: '12px', color: '#3B82F6', lineHeight: 1.6, margin: 0 }}>
            Untuk menambahkan staf kasir baru atau mengubah kata sandi, akses Supabase Dashboard
            pada menu <strong>Authentication › Users</strong>. Sistem ini terintegrasi penuh dengan Supabase Auth.
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: accent }}>
        {value}
      </div>
    </div>
  )
}

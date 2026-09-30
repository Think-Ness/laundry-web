import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#0F172A',
        color: '#CBD5E1',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        overflowY: 'auto',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>🧺</div>
          <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '14px' }}>Latansa Laundry</div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>Dashboard Staf Pondok</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {[
            { href: '/dashboard', icon: '📊', label: 'Dashboard' },
            { href: '/pesanan', icon: '📦', label: 'Pesanan' },
            { href: '/riwayat', icon: '📋', label: 'Riwayat' },
            { href: '/pengaturan', icon: '⚙️', label: 'Pengaturan' },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 10px',
                color: '#94A3B8',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: 500,
                borderRadius: '8px',
                marginBottom: '2px',
                transition: 'all 0.15s',
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '12px', color: '#F8FAFC', fontWeight: 600, marginBottom: '2px' }}>
            {user.email}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '10px' }}>Staf Laundry</div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94A3B8',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12.5px',
              }}
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '28px 32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

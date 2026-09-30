import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Login Staf — Latansa Laundry',
  description: 'Login staf operasional Latansa Laundry',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { redirect: redirectTo, error: errorParam } = await searchParams

  async function login(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string
    const targetRedirect = (formData.get('redirectTo') as string) || '/dashboard'

    if (!email || !password) {
      redirect(`/auth/login?error=${encodeURIComponent('Email dan password wajib diisi.')}`)
    }

    const sb = await createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })

    if (error) {
      redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    redirect(targetRedirect)
  }

  const errorMsg = errorParam ? decodeURIComponent(errorParam) : null

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            background: '#2563EB',
            borderRadius: '12px',
            color: '#FFFFFF',
            marginBottom: '12px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <circle cx="12" cy="13" r="4"/>
              <path d="M6 6h.01M9 6h3"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.3px',
            margin: '0 0 4px',
          }}>
            Latansa Laundry
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px' }}>
            Portal Operasional Staf
          </p>
          <div style={{
            display: 'inline-block',
            padding: '3px 12px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#1D4ED8',
          }}>
            Sistem Laundry Pondok
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        }}>
          <h2 style={{
            fontWeight: 700,
            fontSize: '16px',
            color: '#0F172A',
            margin: '0 0 18px',
          }}>
            Masuk ke Akun
          </h2>

          {errorMsg && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}>
              <svg style={{ flexShrink: 0, marginTop: '2px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form action={login}>
            <input type="hidden" name="redirectTo" value={redirectTo ?? '/dashboard'} />

            {/* Email Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }}>
                EMAIL
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="nama@latansa.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
                letterSpacing: '0.02em',
              }}>
                PASSWORD
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '11px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                transition: 'background-color 0.15s',
              }}
            >
              Masuk ke Dashboard
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#94A3B8',
          marginTop: '20px',
        }}>
          Latansa Laundry · Sistem Laundry Santri Digital
        </p>
      </div>
    </main>
  )
}

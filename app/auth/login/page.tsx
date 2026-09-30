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
      background: 'linear-gradient(145deg, #0D1929 0%, #0F172A 50%, #111827 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative background blur orbs */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-100px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            width: '58px', height: '58px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            borderRadius: '16px',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="4"/>
              <circle cx="12" cy="13" r="4"/>
              <path d="M6 6h.01M9 6h3"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: '24px', fontWeight: 800, color: '#F1F5F9',
            letterSpacing: '-0.03em', margin: '0 0 6px',
          }}>
            Latansa Laundry
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Portal Operasional Staf
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          padding: '28px',
        }}>
          <h2 style={{
            fontWeight: 700,
            fontSize: '16px',
            color: '#E2E8F0',
            margin: '0 0 20px',
          }}>
            Masuk ke Akun
          </h2>

          {errorMsg && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#FCA5A5',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}>
              <svg style={{ flexShrink: 0, marginTop: '1px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', letterSpacing: '0.03em' }}>
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
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F1F5F9',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', letterSpacing: '0.03em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F1F5F9',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                letterSpacing: '0.01em',
              }}
            >
              Masuk ke Dashboard
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#334155',
          marginTop: '20px',
        }}>
          Latansa Laundry · Sistem Laundry Santri Digital
        </p>
      </div>
    </main>
  )
}

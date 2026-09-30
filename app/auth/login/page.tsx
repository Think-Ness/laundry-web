import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Login Staf — Latansa Laundry',
  description: 'Login staf operasional Latansa Laundry pondok',
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

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 9.5h20" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Latansa Laundry</h1>
          <p className="text-sm text-gray-500 mt-1">Portal Operasional Staf</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-5">Masuk ke Akun Staf</h2>

          {errorParam && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/></svg>
              <span>{decodeURIComponent(errorParam)}</span>
            </div>
          )}

          <form action={login}>
            <input type="hidden" name="redirectTo" value={redirectTo ?? '/dashboard'} />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  placeholder="nama@latansa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-blue-500/10"
            >
              Masuk ke Dashboard
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sistem Informasi Latansa Laundry &middot; Pondok Modern
        </p>
      </div>
    </main>
  )
}

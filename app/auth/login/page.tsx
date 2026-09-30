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
          <div className="text-5xl mb-3">🧺</div>
          <h1 className="text-2xl font-bold text-gray-900">Latansa Laundry</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard Staf Laundry Pondok</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-5">Masuk ke Akun Staf</h2>

          {errorParam && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-4">
              ⚠️ {decodeURIComponent(errorParam)}
            </div>
          )}

          <form action={login}>
            <input type="hidden" name="redirectTo" value={redirectTo ?? '/dashboard'} />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Staf
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="sigapdwi@gontor.ac.id"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              Masuk ke Dashboard
            </button>
          </form>

          {/* Quick credentials card */}
          <div className="mt-5 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-2xl text-xs text-gray-600">
            <div className="font-medium text-gray-700 mb-1">Akun Akses Terdaftar:</div>
            <div className="space-y-1 text-[11px] text-gray-500">
              <div>• <b>sigapdwi@gontor.ac.id</b> (Pass: <code className="bg-white px-1 py-0.5 rounded border">gontor123</code>)</div>
              <div>• <b>admin@latansa.com</b> (Pass: <code className="bg-white px-1 py-0.5 rounded border">admin123</code>)</div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Hanya untuk staf operasional Latansa Laundry pondok
        </p>
      </div>
    </main>
  )
}

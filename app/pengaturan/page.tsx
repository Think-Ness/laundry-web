import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Pengaturan Sistem — Latansa Laundry',
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pengaturan & Informasi Sistem</h1>
        <p className="text-sm text-gray-500 mt-0.5">Konfigurasi online Latansa Laundry dan status integrasi cloud</p>
      </div>

      {/* Profil Laundry */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🧺</span> Profil Usaha Laundry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-gray-400 text-xs block mb-1">Nama Usaha</span>
            <span className="font-bold text-gray-900 text-base">Latansa Laundry</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-gray-400 text-xs block mb-1">Unit Pondok</span>
            <span className="font-bold text-gray-800">Layanan Cuci Santri & Wali Santri</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-gray-400 text-xs block mb-1">Cloud Engine</span>
            <span className="font-semibold text-emerald-600">Supabase Cloud PostgreSQL</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-gray-400 text-xs block mb-1">Integrasi Stand Kasir</span>
            <span className="font-semibold text-blue-600">HMAC-SHA256 Signed QR Bridge</span>
          </div>
        </div>
      </div>

      {/* Akun Staf & Admin Terdaftar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <span>👥</span> Akun Staf & Pengelola Terdaftar
          </h2>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            {profiles?.length || 0} Akun Aktif
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {profiles?.map((p: any) => (
            <div key={p.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">{p.name || 'Pengguna'}</div>
                <div className="text-xs text-gray-500 font-mono">{p.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-purple-50 text-purple-700 border border-purple-200">
                  {p.role}
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                  Aktif
                </span>
              </div>
            </div>
          ))}

          {(!profiles || profiles.length === 0) && (
            <div className="py-4 text-center text-sm text-gray-400">
              Belum ada akun lain yang terdaftar.
            </div>
          )}
        </div>
      </div>

      {/* Info Integrasi */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-900">
        <h3 className="font-semibold text-blue-950 mb-1">💡 Informasi Keamanan Akun Staf</h3>
        <p className="text-blue-800 text-xs leading-relaxed">
          Akun staf dikelola langsung melalui database Supabase Auth. Untuk menambahkan staf kasir baru atau mengubah kata sandi, Anda dapat mengakses Supabase Dashboard pada menu <b>Authentication &gt; Users</b>.
        </p>
      </div>
    </div>
  )
}

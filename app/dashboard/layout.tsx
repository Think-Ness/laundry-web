import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import SidebarClient from './sidebar-client'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <SidebarClient userEmail={user.email ?? ''} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}

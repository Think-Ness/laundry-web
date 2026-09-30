'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions'
import StaffScannerModal from './StaffScannerModal'

interface SidebarClientProps {
  userEmail: string
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/pesanan',
    label: 'Pesanan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: '/riwayat',
    label: 'Riwayat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/pengaturan',
    label: 'Pengaturan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
]

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4"/>
      <circle cx="12" cy="13" r="4"/>
      <path d="M6 6h.01M9 6h3"/>
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function ScannerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  )
}

function SidebarContent({ userEmail, onLinkClick, onOpenScanner }: { userEmail: string; onLinkClick?: () => void; onOpenScanner?: () => void }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59,130,246,0.35)',
            flexShrink: 0,
          }}>
            <LogoIcon />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '14px', lineHeight: 1.2 }}>
              Latansa Laundry
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', letterSpacing: '0.04em', marginTop: '2px' }}>
              ADMIN PANEL
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
        {/* Quick Scan Button (S) */}
        {onOpenScanner && (
          <button
            type="button"
            onClick={onOpenScanner}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)',
              color: '#F1F5F9',
              cursor: 'pointer',
              marginBottom: '14px',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ color: '#60A5FA', display: 'flex', alignItems: 'center' }}>
                <ScannerIcon />
              </span>
              Scan Masuk
            </span>
            <kbd
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#94A3B8',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              S
            </kbd>
          </button>
        )}

        <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, letterSpacing: '0.08em', padding: '0 8px', marginBottom: '6px' }}>
          MENU UTAMA
        </div>
        {navItems.map(({ href, label, icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '9px',
                marginBottom: '2px',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: active ? 600 : 500,
                color: active ? '#F1F5F9' : '#94A3B8',
                background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                borderLeft: active ? '2.5px solid #3B82F6' : '2.5px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: active ? '#60A5FA' : '#64748B', display: 'flex', alignItems: 'center' }}>
                {icon}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div style={{
        padding: '14px 10px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px',
          borderRadius: '9px',
          background: 'rgba(255,255,255,0.04)',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '30px', height: '30px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#93C5FD',
            flexShrink: 0,
          }}>
            <UserIcon />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>Staf Laundry</div>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid rgba(248,113,113,0.25)',
              color: '#F87171',
              borderRadius: '9px',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <LogoutIcon />
            Keluar
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SidebarClient({ userEmail }: SidebarClientProps) {
  const [open, setOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // Global Keyboard Shortcut: Press 'S' to open scanner, 'Escape' to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null
      const isTyping = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      )

      if (e.key === 'Escape' && isScannerOpen) {
        setIsScannerOpen(false)
        return
      }

      if ((e.key === 's' || e.key === 'S') && !isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        setIsScannerOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isScannerOpen])

  return (
    <>
      {/* Desktop Sidebar */}
      <aside style={{
        width: '240px',
        background: '#0D1929',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        overflowY: 'auto',
        zIndex: 50,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }} className="sidebar-desktop">
        <SidebarContent
          userEmail={userEmail}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      </aside>

      {/* Mobile Top Bar */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        background: '#0D1929',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 40,
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <LogoIcon />
          </div>
          <span style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '14px' }}>Latansa Laundry</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              background: 'rgba(37,99,235,0.2)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: '#93C5FD',
              borderRadius: '7px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <ScannerIcon />
            <span>Scan (S)</span>
          </button>
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {open ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: '260px',
        background: '#0D1929',
        zIndex: 46,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }} className="mobile-sidebar">
        <div style={{ paddingTop: '8px' }}>
          <SidebarContent
            userEmail={userEmail}
            onLinkClick={() => setOpen(false)}
            onOpenScanner={() => {
              setOpen(false)
              setIsScannerOpen(true)
            }}
          />
        </div>
      </aside>

      {/* Global Staff Scanner Modal */}
      <StaffScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccessScan={() => {
          // If on dashboard or pesanan page, can trigger page refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('order-scanned'))
          }
        }}
      />
    </>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Boxes, LayoutDashboard, Users, Plus, LogOut, Menu, X, ShieldCheck,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/superadmin/dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { href: '/superadmin/tenants',   label: 'Clientes',   Icon: Users },
]

function isActive(href: string, pathname: string) {
  return href === '/superadmin/dashboard'
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()

  const handleSignOut = async () => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
    await sb.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-56 flex-col bg-gray-900">

      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2.5">
          <Boxes className="size-5 shrink-0 text-blue-400" />
          <div>
            <p className="text-[14px] font-bold leading-tight tracking-tight text-white">Nexo</p>
            <p className="text-[10px] font-medium leading-none text-gray-500">Panel Operador</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-gray-600 hover:text-gray-300 lg:hidden">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Superadmin badge */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg bg-blue-900/40 px-3 py-2">
          <ShieldCheck className="size-3.5 shrink-0 text-blue-400" />
          <span className="text-[12px] font-semibold text-blue-300">Superadmin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-2">
        <ul className="space-y-px">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(href, pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Nuevo cliente shortcut */}
      <div className="px-2 pb-2">
        <Link
          href="/superadmin/tenants/new"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <Plus className="size-3.5 shrink-0" />
          Nuevo cliente
        </Link>
      </div>

      {/* Sign out */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
        >
          <LogOut className="size-3.5 shrink-0" />
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:relative lg:inset-auto lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#F9FAFB]">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-500 hover:text-gray-900">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-900">Nexo</span>
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              Operador
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}

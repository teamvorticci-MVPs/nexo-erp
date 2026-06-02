'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Plus,
  LogOut,
  Boxes,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'

interface SuperadminSidebarProps {
  onNavClick?: () => void
}

const navItems = [
  { href: '/superadmin/dashboard', label: 'Tenants', Icon: LayoutDashboard },
  { href: '/superadmin/tenants/new', label: 'Nuevo cliente', Icon: Plus },
]

function isActive(href: string, pathname: string) {
  if (href === '/superadmin/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SuperadminSidebar({ onNavClick }: SuperadminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">

      {/* Logo */}
      <div className="flex h-12 items-center gap-2 border-b border-gray-200 px-4">
        <Boxes className="size-5 shrink-0 text-blue-500" />
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-none tracking-tight text-gray-900">Nexo</p>
          <p className="text-[10px] font-medium text-gray-400">Panel Operador</p>
        </div>
      </div>

      {/* Superadmin badge */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2">
          <ShieldCheck className="size-3.5 shrink-0 text-blue-500" />
          <span className="text-[12px] font-semibold text-blue-700">Superadmin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-px">
          {navItems.map(({ href, label, Icon }) => {
            const active = isActive(href, pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-3.5 shrink-0',
                      active ? 'text-blue-500' : 'text-gray-400',
                    )}
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="size-3.5 shrink-0 text-gray-400" />
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}

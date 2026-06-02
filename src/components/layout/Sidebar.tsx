'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Wallet,
  BarChart2,
  Bell,
  Settings,
  LogOut,
  Boxes,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface SidebarProps {
  onNavClick?: () => void
}

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    Icon: LayoutDashboard, cta: false },
  { href: '/productos',     label: 'Productos',    Icon: Package,         cta: false },
  { href: '/inventario',    label: 'Inventario',   Icon: Warehouse,       cta: false },
  { href: '/caja',          label: 'Caja',         Icon: Wallet,          cta: false },
  { href: '/reportes',      label: 'Reportes',     Icon: BarChart2,       cta: false },
  { href: '/alertas',       label: 'Alertas',      Icon: Bell,            cta: false },
  { href: '/configuracion', label: 'Configuración',Icon: Settings,        cta: false },
  { href: '/ventas',        label: 'Nueva venta',  Icon: ShoppingCart,    cta: true  },
]

function isActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
      {initials}
    </span>
  )
}

export default function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, tenant, isLoading, initialize, signOut } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const logoUrl = tenant?.logo_url ?? null

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">

      {/* 1 · Logo */}
      <div className="flex h-12 items-center gap-2 border-b border-gray-200 px-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="size-6 rounded-md object-cover" />
        ) : (
          <Boxes className="size-5 shrink-0 text-blue-500" />
        )}
        <span className="text-[15px] font-bold tracking-tight text-gray-900">Nexo</span>
      </div>

      {/* 2 · User info */}
      <div className="border-b border-gray-100 px-3 py-2.5">
        {isLoading ? (
          <div className="flex items-center gap-2.5">
            <div className="size-8 animate-pulse rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-2 w-14 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <UserAvatar name={user?.full_name ?? 'U'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-gray-900">
                {user?.full_name ?? '—'}
              </p>
              <p className="text-[11px] capitalize leading-tight text-gray-400">
                {user?.role ?? '—'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3 · Navigation — fills remaining height */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-px">
          {navItems.map(({ href, label, Icon, cta }) => {
            const active = isActive(href, pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                    cta
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-3.5 shrink-0',
                      cta ? 'text-white' : active ? 'text-blue-500' : 'text-gray-400',
                    )}
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

    </aside>
  )
}

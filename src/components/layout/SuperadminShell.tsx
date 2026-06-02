'use client'

import { useState } from 'react'
import { Menu, Boxes, ShieldCheck } from 'lucide-react'
import SuperadminSidebar from './SuperadminSidebar'

export default function SuperadminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const close = () => setSidebarOpen(false)

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:h-full lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SuperadminSidebar onNavClick={close} />
      </div>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#F9FAFB]">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="size-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-900">Nexo</span>
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              <ShieldCheck className="size-3" />
              Operador
            </span>
          </div>
          <div className="w-8" />
        </header>

        {children}
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Menu, Boxes } from 'lucide-react'
import Sidebar from './Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const close = () => setSidebarOpen(false)

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sidebar wrapper — fixed on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:relative lg:inset-auto lg:z-auto lg:h-full lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavClick={close} />
      </div>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#F9FAFB]">
        {/* Mobile header — hidden on lg+ */}
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Boxes className="size-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-900">Nexo</span>
          </div>
          {/* Spacer so logo stays centred */}
          <div className="w-8" aria-hidden />
        </header>

        {/* Page */}
        {children}
      </main>
    </div>
  )
}

'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Package, TrendingUp, TrendingDown, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useInventory, type MovementFilter, type PeriodFilter } from '@/hooks/useInventory'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentos secos': 'bg-blue-500',
  'Alimentos húmedos': 'bg-cyan-500',
  'Snacks y premios': 'bg-orange-500',
  Accesorios: 'bg-purple-500',
  'Higiene y cuidado': 'bg-pink-500',
  Medicamentos: 'bg-red-500',
}

function categoryColor(c: string | null | undefined) {
  return c ? (CATEGORY_COLORS[c] ?? 'bg-gray-500') : 'bg-gray-400'
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function dateLabel(iso: string) {
  return format(new Date(iso), "d MMM 'a las' HH:mm", { locale: es })
}

const TYPE_META = {
  entrada: { label: 'Entrada', badgeCls: 'bg-green-100 text-green-700', qtyColor: 'text-green-600' },
  salida: { label: 'Salida', badgeCls: 'bg-red-100 text-red-700', qtyColor: 'text-red-500' },
  ajuste: { label: 'Ajuste', badgeCls: 'bg-gray-100 text-gray-600', qtyColor: 'text-gray-600' },
} as const

function qtyLabel(type: string, qty: number) {
  if (type === 'entrada') return `+${qty}`
  if (type === 'salida') return `${qty}`
  return `${qty > 0 ? '+' : ''}${qty}`
}

function Seg<T extends string>({
  value,
  current,
  label,
  onClick,
}: {
  value: T
  current: T
  label: string
  onClick: (v: T) => void
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        current === value
          ? 'bg-blue-500 text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

export default function InventarioPage() {
  const {
    movements,
    kpis,
    isLoading,
    error,
    typeFilter,
    setTypeFilter,
    periodFilter,
    setPeriodFilter,
    search,
    setSearch,
  } = useInventory()

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Movimientos de stock de tu negocio</p>
      </div>

      {/* KPI cards — 1 col mobile, 3 col sm+ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500 sm:text-sm">Entradas</span>
            <div className="rounded-lg bg-green-50 p-1.5 sm:p-2">
              <TrendingUp className="size-3.5 text-green-500 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 sm:mt-3">{kpis.totalEntradas}</p>
          <p className="mt-1 text-xs text-gray-400">unidades recibidas</p>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500 sm:text-sm">Salidas</span>
            <div className="rounded-lg bg-red-50 p-1.5 sm:p-2">
              <TrendingDown className="size-3.5 text-red-400 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 sm:mt-3">{kpis.totalSalidas}</p>
          <p className="mt-1 text-xs text-gray-400">unidades despachadas</p>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500 sm:text-sm">Ajustes</span>
            <div className="rounded-lg bg-gray-100 p-1.5 sm:p-2">
              <RefreshCw className="size-3.5 text-gray-500 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 sm:mt-3">{kpis.totalAjustes}</p>
          <p className="mt-1 text-xs text-gray-400">ajustes realizados</p>
        </div>
      </div>

      {/* Filters — scroll horizontal on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Package className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Type + Period filters — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(
              [
                { value: 'all', label: 'Todos' },
                { value: 'entrada', label: 'Entradas' },
                { value: 'salida', label: 'Salidas' },
                { value: 'ajuste', label: 'Ajustes' },
              ] as { value: MovementFilter; label: string }[]
            ).map(({ value, label }) => (
              <Seg key={value} value={value} current={typeFilter} label={label} onClick={setTypeFilter} />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(
              [
                { value: 'today', label: 'Hoy' },
                { value: 'week', label: '7 días' },
                { value: 'month', label: '30 días' },
                { value: 'all', label: 'Todo' },
              ] as { value: PeriodFilter; label: string }[]
            ).map(({ value, label }) => (
              <Seg key={value} value={value} current={periodFilter} label={label} onClick={setPeriodFilter} />
            ))}
          </div>
        </div>
      </div>

      {/* Movement list */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <SlidersHorizontal className="size-10 stroke-[1.5]" />
            <p className="text-sm">Sin movimientos en el período seleccionado</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {movements.map((m) => {
              const meta = TYPE_META[m.type as keyof typeof TYPE_META]
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50 sm:gap-4 sm:px-5 sm:py-3.5"
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:size-9 ${categoryColor(m.products?.category)}`}
                  >
                    {initials(m.products?.name ?? '?')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900 sm:text-sm">
                      {m.products?.name ?? 'Producto eliminado'}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {dateLabel(m.created_at)}
                      {m.users?.full_name && ` · ${m.users.full_name}`}
                      {m.reference && ` · Ref: ${m.reference}`}
                    </p>
                  </div>

                  <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${meta.badgeCls}`}>
                    {meta.label}
                  </span>

                  <span className={`shrink-0 text-[13px] font-bold sm:text-sm ${meta.qtyColor}`}>
                    {qtyLabel(m.type, m.quantity)} {m.products?.unit ?? 'uds'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

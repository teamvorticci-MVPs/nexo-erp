import type { Metadata } from 'next'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import SalesChart from './_components/sales-chart'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Mock data ────────────────────────────────────────────────────────────────

const kpis = [
  {
    label: 'Ventas hoy',
    value: '$245.800',
    change: 12.5,
    Icon: DollarSign,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    label: 'Ganancia hoy',
    value: '$73.400',
    change: 8.3,
    Icon: TrendingUp,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    label: 'Productos vendidos',
    value: '24',
    change: 14.3,
    Icon: ShoppingCart,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
  },
  {
    label: 'Stock crítico',
    value: '5',
    change: -2,
    Icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
]

const lowStockProducts = [
  { id: '1', name: 'Royal Canin Adult 15kg', stock: 2, min: 5, level: 'critico' as const },
  { id: '2', name: 'Pedigree Cachorro 3kg', stock: 1, min: 3, level: 'agotado' as const },
  { id: '3', name: 'Hills Science Diet 4kg', stock: 4, min: 5, level: 'bajo' as const },
  { id: '4', name: 'Purina Pro Plan 8kg', stock: 3, min: 4, level: 'bajo' as const },
  { id: '5', name: 'Eukanuba Adulto 12kg', stock: 0, min: 3, level: 'agotado' as const },
]

const lastSales = [
  { id: 'V-001', customer: 'María González', total: 42500, method: 'efectivo', time: '14:32' },
  { id: 'V-002', customer: 'Carlos Ruiz', total: 89900, method: 'débito', time: '13:15' },
  { id: 'V-003', customer: 'Sin nombre', total: 18200, method: 'efectivo', time: '12:50' },
  { id: 'V-004', customer: 'Andrea López', total: 63400, method: 'transferencia', time: '11:08' },
  { id: 'V-005', customer: 'Pedro Soto', total: 31800, method: 'débito', time: '10:27' },
]

const movements = [
  { id: 'm1', product: 'Royal Canin Adult 15kg', type: 'entrada' as const, qty: 10, user: 'J. Martínez', time: '13:00' },
  { id: 'm2', product: 'Pedigree Cachorro 3kg', type: 'salida' as const, qty: -2, user: 'J. Martínez', time: '12:50' },
  { id: 'm3', product: 'Hills Science Diet 4kg', type: 'ajuste' as const, qty: -1, user: 'Admin', time: '10:30' },
  { id: 'm4', product: 'Purina Pro Plan 8kg', type: 'entrada' as const, qty: 6, user: 'Admin', time: '09:15' },
  { id: 'm5', product: 'Whiskas Adulto 400g', type: 'salida' as const, qty: -3, user: 'J. Martínez', time: '08:45' },
]

const alertLevelStyle = {
  bajo: 'bg-yellow-100 text-yellow-700',
  critico: 'bg-red-100 text-red-700',
  agotado: 'bg-red-100 text-red-800 font-semibold',
}

const movementStyle = {
  entrada: 'text-green-600',
  salida: 'text-red-500',
  ajuste: 'text-yellow-600',
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-[13px] capitalize text-gray-500">{today}</p>
      </div>

      {/* KPI Cards — 2 cols on mobile, 4 on xl */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, change, Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-500 sm:text-sm">{label}</span>
              <div className={`rounded-lg p-1.5 sm:p-2 ${iconBg}`}>
                <Icon className={`size-3.5 sm:size-4 ${iconColor}`} />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900 sm:mt-3 sm:text-2xl">{value}</p>
            <p
              className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium sm:text-xs ${
                change >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {change >= 0 ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(change)}% vs ayer
            </p>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900 sm:text-sm">
              Ventas últimos 30 días
            </h2>
            <p className="text-xs text-gray-400">— Meta diaria</p>
          </div>
        </div>
        {/* Height: 180px mobile → 220px sm+ */}
        <div className="h-[180px] sm:h-[220px]">
          <SalesChart />
        </div>
      </div>

      {/* Bottom Panels — stacked on mobile, 3 cols on lg */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 sm:gap-4">
        {/* Stock bajo */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
            Stock bajo / crítico
          </h2>
          <ul className="space-y-2.5">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-gray-700">{p.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500">{p.stock} uds</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${alertLevelStyle[p.level]}`}
                  >
                    {p.level}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Últimas ventas */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
            Últimas ventas
          </h2>
          <ul className="space-y-2.5">
            {lastSales.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-800">{s.customer}</p>
                  <p className="text-[11px] capitalize text-gray-400">
                    {s.id} · {s.method} · {s.time}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-gray-900">
                  ${s.total.toLocaleString('es-CL')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Movimientos de inventario */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
            Movimientos de inventario
          </h2>
          <ul className="space-y-2.5">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-800">{m.product}</p>
                  <p className="text-[11px] text-gray-400">
                    {m.user} · {m.time}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${movementStyle[m.type]}`}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import { useReports, type ReportPeriod } from '@/hooks/useReports'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`
const pct = (n: number) => `${n.toFixed(1)}%`

const RANK_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
]

const TABS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="mb-1 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className={p.name === 'ventas' ? 'text-blue-600' : 'text-red-400'}>
          {p.name === 'ventas' ? 'Ventas' : 'Costos'}: {clp(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function ReportesPage() {
  const { period, setPeriod, kpis, chartData, topProducts, isLoading, error } = useReports()

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header + tabs — stacked on mobile, inline on sm+ */}
      <div className="space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Análisis de ventas y rentabilidad</p>
        </div>
        {/* Tabs — full width on mobile */}
        <div className="flex w-full items-center rounded-lg border border-gray-200 bg-white p-1 sm:w-auto">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                period === value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : (
        <>
          {/* KPI Cards — 2x2 on mobile, 4 cols on xl */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 sm:text-sm">Ventas</span>
                <div className="rounded-lg bg-blue-50 p-1.5 sm:p-2">
                  <DollarSign className="size-3.5 text-blue-500 sm:size-4" />
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-gray-900 sm:mt-3 sm:text-xl">
                {clp(kpis.totalVentas)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">
                {kpis.countVentas} {kpis.countVentas === 1 ? 'transacción' : 'transacciones'}
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 sm:text-sm">Costos</span>
                <div className="rounded-lg bg-red-50 p-1.5 sm:p-2">
                  <TrendingDown className="size-3.5 text-red-400 sm:size-4" />
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-gray-900 sm:mt-3 sm:text-xl">
                {clp(kpis.totalCostos)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">costo total</p>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 sm:text-sm">Ganancias</span>
                <div className="rounded-lg bg-green-50 p-1.5 sm:p-2">
                  <TrendingUp className="size-3.5 text-green-500 sm:size-4" />
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-green-600 sm:mt-3 sm:text-xl">
                {clp(kpis.totalGanancias)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">beneficio neto</p>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500 sm:text-sm">Margen</span>
                <div className="rounded-lg bg-purple-50 p-1.5 sm:p-2">
                  <BarChart2 className="size-3.5 text-purple-500 sm:size-4" />
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-gray-900 sm:mt-3 sm:text-xl">
                {pct(kpis.margenPromedio)}
              </p>
              <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">promedio</p>
            </div>
          </div>

          {/* Chart + Top products — stacked on mobile, 3 cols on lg */}
          <div className="grid gap-3 lg:grid-cols-3 sm:gap-4">
            {/* Bar chart */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
              <h2 className="mb-3 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
                Ventas vs Costos
              </h2>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                  Sin ventas en el período seleccionado
                </div>
              ) : (
                /* Scrollable wrapper on mobile for many bars */
                <div className="overflow-x-auto">
                  <div
                    className="h-[200px] sm:h-[240px]"
                    style={{
                      minWidth:
                        period === 'monthly' ? '480px' : period === 'weekly' ? '320px' : undefined,
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        barSize={period === 'monthly' ? 6 : period === 'weekly' ? 12 : 18}
                        barCategoryGap="30%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#9CA3AF' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#9CA3AF' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000000
                              ? `$${(v / 1000000).toFixed(1)}M`
                              : v >= 1000
                              ? `$${(v / 1000).toFixed(0)}k`
                              : `$${v}`
                          }
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          formatter={(value: string) =>
                            value === 'ventas' ? 'Ventas' : 'Costos'
                          }
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                        <Bar dataKey="ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="costos" fill="#F87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Top 5 products */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
                Más vendidos
              </h2>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  Sin datos
                </div>
              ) : (
                <ol className="space-y-3">
                  {topProducts.map((product, i) => (
                    <li key={product.id} className="flex items-center gap-3">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          RANK_COLORS[i] ?? 'bg-gray-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-gray-900 sm:text-sm">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {product.totalQuantity} uds · {clp(product.totalRevenue)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

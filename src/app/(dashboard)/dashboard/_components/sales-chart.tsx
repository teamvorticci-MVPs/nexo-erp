'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const salesData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  ventas: Math.round(200000 + Math.sin(i * 0.7) * 80000 + i * 2500),
  meta: 220000,
}))

function formatCLP(value: number) {
  return `$${(value / 1000).toFixed(0)}K`
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="mb-1 font-medium text-gray-700">Día {label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600">
          {p.name === 'ventas' ? 'Ventas' : 'Meta'}:{' '}
          <span className="font-semibold text-gray-900">
            ${p.value.toLocaleString('es-CL')}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={salesData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tickFormatter={formatCLP}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="ventas"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#gradVentas)"
          dot={false}
          activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="meta"
          stroke="#E5E7EB"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

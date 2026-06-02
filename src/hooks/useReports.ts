import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

// Fields fetched from DB — total_profit / margin_pct are GENERATED ALWAYS AS STORED
// columns that can occasionally return null immediately after insert on some Postgres
// versions. We fetch the raw fields and recompute client-side for reliability.
type SaleRow = {
  id: string
  total: unknown          // numeric → string from PostgREST
  total_cost: unknown
  discount_amount: unknown
  created_at: string
}

type SaleItemRow = {
  quantity: number
  unit_price: unknown     // numeric → string from PostgREST
  line_total: unknown
  created_at: string
  products: { id: string; name: string; category: string | null } | null
}

export type TopProduct = {
  id: string
  name: string
  category: string | null
  totalQuantity: number
  totalRevenue: number
}

export type ChartDataPoint = {
  date: string
  ventas: number
  costos: number
}

export type ReportKPIs = {
  totalVentas: number
  totalCostos: number
  totalGanancias: number
  margenPromedio: number
  countVentas: number
}

// Coerce any PostgREST value (string | number | null) to a JS number safely
function n(v: unknown): number {
  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed : 0
}

// ─── Date ranges ─────────────────────────────────────────────────────────────
// Always start from midnight (startOfDay) so that:
//  - eachDayOfInterval keys align with the DB filter window
//  - Sales made early in the day aren't excluded when the query runs at midday

function getDateRange(period: ReportPeriod) {
  const now = new Date()
  if (period === 'daily') return { start: startOfDay(now), end: now }
  if (period === 'weekly') return { start: startOfDay(subDays(now, 6)), end: now }
  return { start: startOfDay(subDays(now, 29)), end: now }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReports() {
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [sales, setSales] = useState<SaleRow[]>([])
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = createClient() as any
    const { start } = getDateRange(period)
    const startISO = start.toISOString()

    const [salesRes, itemsRes] = await Promise.all([
      raw
        .from('sales')
        // Fetch the raw numeric fields — compute profit/margin client-side
        .select('id, total, total_cost, discount_amount, created_at')
        .eq('status', 'completada')
        .gte('created_at', startISO)
        .order('created_at'),
      raw
        .from('sale_items')
        .select('quantity, unit_price, line_total, created_at, products(id, name, category)')
        .gte('created_at', startISO),
    ])

    if (salesRes.error) {
      setError(salesRes.error.message)
    } else {
      setSales(salesRes.data ?? [])
    }
    if (itemsRes.error && !salesRes.error) {
      setError(itemsRes.error.message)
    } else {
      setSaleItems(itemsRes.data ?? [])
    }
    setIsLoading(false)
  }, [period])

  useEffect(() => {
    refetch()
  }, [refetch])

  // ── KPIs — computed from raw fields, not generated columns ─────────────────

  const kpis: ReportKPIs = useMemo(() => {
    const totalVentas = sales.reduce((s, r) => s + n(r.total), 0)
    const totalCostos = sales.reduce((s, r) => s + n(r.total_cost), 0)
    // Recompute profit: total − total_cost − discount_amount
    const totalGanancias = sales.reduce(
      (s, r) => s + (n(r.total) - n(r.total_cost) - n(r.discount_amount)),
      0,
    )
    // Margin: profit / cost × 100, averaged across sales
    const margenPromedio =
      totalCostos > 0 ? (totalGanancias / totalCostos) * 100 : 0

    return {
      totalVentas,
      totalCostos,
      totalGanancias,
      margenPromedio,
      countVentas: sales.length,
    }
  }, [sales])

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData: ChartDataPoint[] = useMemo(() => {
    const { start, end } = getDateRange(period)

    if (period === 'daily') {
      const buckets: Record<number, { ventas: number; costos: number }> = {}
      for (let h = 0; h < 24; h++) buckets[h] = { ventas: 0, costos: 0 }
      sales.forEach((s) => {
        const h = new Date(s.created_at).getHours()
        buckets[h].ventas += n(s.total)
        buckets[h].costos += n(s.total_cost)
      })
      // Only emit hours that have data to keep chart readable
      return Object.entries(buckets)
        .map(([h, v]) => ({ date: `${h}h`, ...v }))
        .filter((d) => d.ventas > 0 || d.costos > 0)
    }

    // Weekly / monthly: group by calendar day
    const days: Record<string, { ventas: number; costos: number }> = {}
    eachDayOfInterval({ start, end }).forEach((d) => {
      days[format(d, 'dd/MM')] = { ventas: 0, costos: 0 }
    })
    sales.forEach((s) => {
      const key = format(new Date(s.created_at), 'dd/MM')
      if (days[key]) {
        days[key].ventas += n(s.total)
        days[key].costos += n(s.total_cost)
      }
    })
    return Object.entries(days).map(([date, v]) => ({ date, ...v }))
  }, [sales, period])

  // ── Top 5 products ─────────────────────────────────────────────────────────

  const topProducts: TopProduct[] = useMemo(() => {
    const map: Record<string, TopProduct> = {}
    saleItems.forEach((item) => {
      if (!item.products) return
      const { id, name, category } = item.products
      if (!map[id]) map[id] = { id, name, category, totalQuantity: 0, totalRevenue: 0 }
      map[id].totalQuantity += item.quantity
      // line_total is generated; fall back to quantity × unit_price if null/0
      const revenue = n(item.line_total) || item.quantity * n(item.unit_price)
      map[id].totalRevenue += revenue
    })
    return Object.values(map)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5)
  }, [saleItems])

  return { period, setPeriod, kpis, chartData, topProducts, isLoading, error, refetch }
}

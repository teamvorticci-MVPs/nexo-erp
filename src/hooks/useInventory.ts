import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MovementType } from '@/types/database'

export type MovementFilter = MovementType | 'all'
export type PeriodFilter = 'today' | 'week' | 'month' | 'all'

export type InventoryMovementRow = {
  id: string
  type: MovementType
  quantity: number
  cost_price: number | null
  stock_before: number
  stock_after: number
  reference: string | null
  notes: string | null
  created_at: string
  products: { name: string; category: string | null; sku: string | null; unit: string } | null
  users: { full_name: string } | null
}

export type InventoryKPIs = {
  totalEntradas: number
  totalSalidas: number
  totalAjustes: number
}

function getStartDate(period: PeriodFilter): Date | null {
  const now = new Date()
  if (period === 'today') {
    now.setHours(0, 0, 0, 0)
    return now
  }
  if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }
  if (period === 'month') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }
  return null
}

export function useInventory() {
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<MovementFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [search, setSearch] = useState('')

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('inventory_movements')
      .select(
        'id, type, quantity, cost_price, stock_before, stock_after, reference, notes, created_at, products(name, category, sku, unit), users(full_name)',
      )
      .order('created_at', { ascending: false })

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }
    const startDate = getStartDate(periodFilter)
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setMovements((data ?? []) as InventoryMovementRow[])
    setIsLoading(false)
  }, [typeFilter, periodFilter])

  useEffect(() => {
    refetch()
  }, [refetch])

  const filtered = search
    ? movements.filter((m) => {
        const q = search.toLowerCase()
        return (
          m.products?.name.toLowerCase().includes(q) ||
          m.products?.sku?.toLowerCase().includes(q) ||
          m.users?.full_name.toLowerCase().includes(q) ||
          m.reference?.toLowerCase().includes(q)
        )
      })
    : movements

  const kpis: InventoryKPIs = {
    totalEntradas: movements
      .filter((m) => m.type === 'entrada')
      .reduce((s, m) => s + m.quantity, 0),
    totalSalidas: movements
      .filter((m) => m.type === 'salida')
      .reduce((s, m) => s + Math.abs(m.quantity), 0),
    totalAjustes: movements.filter((m) => m.type === 'ajuste').length,
  }

  return {
    movements: filtered,
    kpis,
    isLoading,
    error,
    typeFilter,
    setTypeFilter,
    periodFilter,
    setPeriodFilter,
    search,
    setSearch,
    refetch,
  }
}

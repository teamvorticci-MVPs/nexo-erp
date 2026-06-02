import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { StockAlertLevel } from '@/types/database'

export type AlertRow = {
  id: string
  level: StockAlertLevel
  stock_current: number
  stock_min: number
  resolved: boolean
  created_at: string
  products: {
    id: string
    name: string
    sku: string | null
    category: string | null
    stock_quantity: number
    stock_min: number
    unit: string
  } | null
}

// Untyped raw client for insert (avoids RejectExcessProperties<never> issue)
function getRawClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, tenant } = useAuthStore()

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (createClient() as any)
      .from('stock_alerts')
      .select(
        'id, level, stock_current, stock_min, resolved, created_at, products(id, name, sku, category, stock_quantity, stock_min, unit)',
      )
      .eq('resolved', false)
      .order('level')
    if (err) setError(err.message)
    else setAlerts((data ?? []) as AlertRow[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const urgent = alerts.filter((a) => a.level === 'agotado' || a.level === 'critico')
  const low = alerts.filter((a) => a.level === 'bajo')

  const registerEntry = useCallback(
    async (productId: string, quantity: number): Promise<{ error?: string }> => {
      if (!user || !tenant) return { error: 'Sin sesión activa' }
      const { error: err } = await getRawClient()
        .from('inventory_movements')
        .insert({
          tenant_id: tenant.id,
          product_id: productId,
          user_id: user.id,
          type: 'entrada',
          quantity,
        })
      if (err) return { error: err.message }
      await refetch()
      return {}
    },
    [user, tenant, refetch],
  )

  return {
    alerts,
    urgent,
    low,
    summary: { urgent: urgent.length, low: low.length },
    isLoading,
    error,
    refetch,
    registerEntry,
  }
}

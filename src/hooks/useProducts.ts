import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Product } from '@/types/database'

export type ProductFormData = {
  name: string
  sku: string
  description: string
  brand: string
  category: string
  unit: string
  cost_price: number
  sale_price: number
  stock_quantity: number
  stock_min: number
  stock_max: number | null
  barcode: string
  active: boolean
}

// Raw (untyped) browser client for insert/update — avoids the postgrest-js
// RejectExcessProperties<never> inference issue that occurs with the Database generic.
// createBrowserClient is a singleton per URL+key, so this shares the auth session.
function getRawClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tenant = useAuthStore((s) => s.tenant)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (err) setError(err.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else setProducts((data ?? []) as any as Product[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const createProduct = useCallback(
    async (data: ProductFormData): Promise<{ error?: string }> => {
      if (!tenant) return { error: 'Sin sesión activa' }
      const { error: err } = await getRawClient()
        .from('products')
        .insert({
          tenant_id: tenant.id,
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          brand: data.brand || null,
          category: data.category || null,
          unit: data.unit || 'unidad',
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          stock_quantity: data.stock_quantity,
          stock_min: data.stock_min,
          stock_max: data.stock_max ?? null,
          barcode: data.barcode || null,
          active: data.active,
        })
      if (err) return { error: err.message }
      await refetch()
      return {}
    },
    [tenant, refetch],
  )

  const updateProduct = useCallback(
    async (id: string, data: ProductFormData): Promise<{ error?: string }> => {
      const { error: err } = await getRawClient()
        .from('products')
        .update({
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          brand: data.brand || null,
          category: data.category || null,
          unit: data.unit || 'unidad',
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          stock_quantity: data.stock_quantity,
          stock_min: data.stock_min,
          stock_max: data.stock_max ?? null,
          barcode: data.barcode || null,
          active: data.active,
        })
        .eq('id', id)
      if (err) return { error: err.message }
      await refetch()
      return {}
    },
    [refetch],
  )

  const deleteProduct = useCallback(async (id: string): Promise<{ error?: string }> => {
    const { error: err } = await getRawClient()
      .from('products')
      .update({ active: false })
      .eq('id', id)
    if (err) return { error: err.message }
    setProducts((prev) => prev.filter((p) => p.id !== id))
    return {}
  }, [])

  return { products, isLoading, error, refetch, createProduct, updateProduct, deleteProduct }
}

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { registerSale as registerSaleAction } from '@/app/actions/sales'
import type { Product, PaymentMethod } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  productId: string
  name: string
  unitPrice: number // sale_price (IVA included)
  unitCost: number  // cost_price
  unit: string
  quantity: number
}

// IVA Chile 19%
export const TAX_RATE = 0.19

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSales() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [search, setSearch] = useState('')
  const { user, tenant } = useAuthStore()

  // Load active products once
  useEffect(() => {
    setIsLoadingProducts(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(createClient() as any)
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data, error }: { data: unknown[] | null; error: { message: string } | null }) => {
        if (!error) setProducts((data ?? []) as Product[])
        setIsLoadingProducts(false)
      })
  }, [])

  const filteredProducts = useMemo(
    () =>
      search
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.category?.toLowerCase().includes(search.toLowerCase()) ||
              p.sku?.toLowerCase().includes(search.toLowerCase()),
          )
        : products,
    [products, search],
  )

  // ── Cart operations ─────────────────────────────────────────────────────────

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const hit = prev.find((i) => i.productId === product.id)
      if (hit) return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.sale_price,
          unitCost: product.cost_price,
          unit: product.unit,
          quantity: 1,
        },
      ]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const setQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId))
    } else {
      setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)))
    }
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setPaymentMethod('efectivo')
    setRegisterError(null)
  }, [])

  // ── Computed totals ─────────────────────────────────────────────────────────

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart],
  )
  const subtotal = useMemo(() => Math.round(total / (1 + TAX_RATE)), [total])
  const taxAmount = useMemo(() => total - subtotal, [total, subtotal])
  const totalCost = useMemo(
    () => cart.reduce((s, i) => s + i.unitCost * i.quantity, 0),
    [cart],
  )

  // ── Register sale ───────────────────────────────────────────────────────────

  const registerSale = useCallback(
    async (cashRegisterId?: string | null): Promise<{ error?: string }> => {
      if (!user || !tenant) return { error: 'Sin sesión activa' }
      if (cart.length === 0) return { error: 'El carrito está vacío' }

      setIsRegistering(true)
      setRegisterError(null)
      setRegisterSuccess(false)

      const result = await registerSaleAction({
        cashRegisterId,
        paymentMethod,
        subtotal,
        taxAmount,
        total,
        totalCost,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
        })),
      })

      setIsRegistering(false)

      if (result.error) {
        setRegisterError(result.error)
        return { error: result.error }
      }

      // Update local product stock so the grid reflects the new quantities immediately
      setProducts((prev) =>
        prev.map((p) => {
          const sold = cart.find((i) => i.productId === p.id)
          if (!sold) return p
          return { ...p, stock_quantity: Math.max(0, p.stock_quantity - sold.quantity) }
        }),
      )

      setRegisterSuccess(true)
      clearCart()
      setTimeout(() => setRegisterSuccess(false), 3000)
      return {}
    },
    [user, tenant, cart, paymentMethod, subtotal, taxAmount, total, totalCost, clearCart],
  )

  return {
    products: filteredProducts,
    isLoadingProducts,
    search,
    setSearch,
    cart,
    paymentMethod,
    setPaymentMethod,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    total,
    subtotal,
    taxAmount,
    totalCost,
    isRegistering,
    registerError,
    registerSuccess,
    setRegisterError,
    registerSale,
  }
}

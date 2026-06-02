import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { CashRegister, CashMovement } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesByMethod = {
  efectivo: number
  debito: number
  credito: number
  transferencia: number
  otro: number
}

type PartialSale = {
  id: string
  payment_method: string
  total: number
  status: string
}

function getRawClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCaja() {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [sales, setSales] = useState<PartialSale[]>([])
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, tenant } = useAuthStore()

  const refetch = useCallback(async () => {
    if (!tenant) return
    setIsLoading(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    const { data: registerRows, error: regError } = await supabase
      .from('cash_registers')
      .select('*')
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)

    if (regError) {
      setError(regError.message)
      setIsLoading(false)
      return
    }

    const register: CashRegister | null = (registerRows?.[0] as CashRegister) ?? null
    setCashRegister(register)

    if (!register) {
      setSales([])
      setMovements([])
      setIsLoading(false)
      return
    }

    const [salesRes, movRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id, payment_method, total, status')
        .eq('cash_register_id', register.id)
        .eq('status', 'completada'),
      supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', register.id),
    ])

    if (salesRes.error) setError(salesRes.error.message)
    else setSales((salesRes.data ?? []) as PartialSale[])

    if (movRes.error && !salesRes.error) setError(movRes.error.message)
    else setMovements((movRes.data ?? []) as CashMovement[])

    setIsLoading(false)
  }, [tenant])

  useEffect(() => {
    refetch()
  }, [refetch])

  // ── Computed ────────────────────────────────────────────────────────────────

  const salesByMethod = useMemo<SalesByMethod>(
    () => ({
      efectivo: sales
        .filter((s) => s.payment_method === 'efectivo')
        .reduce((s, r) => s + Number(r.total), 0),
      debito: sales
        .filter((s) => s.payment_method === 'debito')
        .reduce((s, r) => s + Number(r.total), 0),
      credito: sales
        .filter((s) => s.payment_method === 'credito')
        .reduce((s, r) => s + Number(r.total), 0),
      transferencia: sales
        .filter((s) => s.payment_method === 'transferencia')
        .reduce((s, r) => s + Number(r.total), 0),
      otro: sales
        .filter((s) => s.payment_method === 'otro')
        .reduce((s, r) => s + Number(r.total), 0),
    }),
    [sales],
  )

  const expectedBalance = useMemo(() => {
    if (!cashRegister) return 0
    const ingresos = movements
      .filter((m) => m.type === 'ingreso')
      .reduce((s, m) => s + Number(m.amount), 0)
    const egresos = movements
      .filter((m) => m.type === 'egreso')
      .reduce((s, m) => s + Number(m.amount), 0)
    return Number(cashRegister.opening_balance) + salesByMethod.efectivo + ingresos - egresos
  }, [cashRegister, movements, salesByMethod])

  const totalSales = useMemo(
    () => sales.reduce((s, r) => s + Number(r.total), 0),
    [sales],
  )

  // ── Actions ─────────────────────────────────────────────────────────────────

  const openCaja = useCallback(
    async (openingBalance: number): Promise<{ error?: string }> => {
      if (!user || !tenant) return { error: 'Sin sesión activa' }
      const { error: err } = await getRawClient()
        .from('cash_registers')
        .insert({ tenant_id: tenant.id, user_id: user.id, opening_balance: openingBalance })
      if (err) return { error: err.message }
      await refetch()
      return {}
    },
    [user, tenant, refetch],
  )

  const closeCaja = useCallback(
    async (closingBalance: number, notes: string): Promise<{ error?: string }> => {
      if (!cashRegister) return { error: 'No hay caja abierta' }
      const { error: err } = await getRawClient()
        .from('cash_registers')
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          expected_balance: expectedBalance,
          notes: notes.trim() || null,
        })
        .eq('id', cashRegister.id)
      if (err) return { error: err.message }
      await refetch()
      return {}
    },
    [cashRegister, expectedBalance, refetch],
  )

  return {
    cashRegister,
    sales,
    movements,
    salesByMethod,
    expectedBalance,
    totalSales,
    isLoading,
    error,
    refetch,
    openCaja,
    closeCaja,
  }
}

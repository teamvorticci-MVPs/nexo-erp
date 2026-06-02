'use server'

import { createClient as createSBClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { PaymentMethod } from '@/types/database'

function getAdmin() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string }

export type SaleItemInput = {
  productId: string
  quantity: number
  unitPrice: number
  unitCost: number
}

export type RegisterSaleInput = {
  cashRegisterId?: string | null
  paymentMethod: PaymentMethod
  subtotal: number
  discountAmount?: number
  taxAmount: number
  total: number
  totalCost: number
  items: SaleItemInput[]
}

/**
 * Registers a sale atomically:
 *  1. Insert sale as 'pendiente' — avoids trg_process_sale_items firing before items exist
 *  2. Insert sale_items
 *  3. Insert inventory_movements (type='salida') per item
 *     → triggers apply_inventory_movement → decrements products.stock_quantity atomically (FOR UPDATE)
 *     → triggers evaluate_stock_alert → creates/resolves stock alerts
 *  4. Update sale to 'completada'
 */
export async function registerSale(
  input: RegisterSaleInput,
): Promise<ActionResult<{ saleId: string }>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    if (!profile) return { error: 'Perfil no encontrado' }

    const tenantId = (profile as { tenant_id: string }).tenant_id
    const admin = getAdmin()

    // ── 1. Sale header — status 'pendiente' bypasses the trigger that reads ──
    // sale_items before they exist (trg_process_sale_items fires on INSERT     ──
    // with status='completada', but items haven't been inserted yet)           ──
    const { data: saleData, error: saleError } = await admin
      .from('sales')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        cash_register_id: input.cashRegisterId ?? null,
        status: 'pendiente',
        payment_method: input.paymentMethod,
        subtotal: input.subtotal,
        discount_amount: input.discountAmount ?? 0,
        tax_amount: input.taxAmount,
        total: input.total,
        total_cost: input.totalCost,
      })
      .select('id')
      .single()

    if (saleError) return { error: saleError.message }

    const saleId = (saleData as { id: string }).id

    // ── 2. Sale items ──────────────────────────────────────────────────────────
    const itemRows = input.items.map((item) => ({
      tenant_id: tenantId,
      sale_id: saleId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.unitCost,
      discount_pct: 0,
    }))

    const { error: itemsError } = await admin.from('sale_items').insert(itemRows)
    if (itemsError) {
      await admin.from('sales').delete().eq('id', saleId)
      return { error: itemsError.message }
    }

    // ── 3. Inventory movements — triggers apply_inventory_movement which ───────
    // uses FOR UPDATE on the product row for atomic stock decrement.           ──
    // Also triggers evaluate_stock_alert on any products.stock_quantity change.──
    const movementRows = input.items.map((item) => ({
      tenant_id: tenantId,
      product_id: item.productId,
      user_id: user.id,
      type: 'salida',
      quantity: item.quantity,
      cost_price: item.unitCost,
      reference: `venta:${saleId}`,
    }))

    const { error: movError } = await admin.from('inventory_movements').insert(movementRows)
    if (movError) {
      await admin.from('sale_items').delete().eq('sale_id', saleId)
      await admin.from('sales').delete().eq('id', saleId)
      return { error: movError.message.includes('Stock insuficiente')
        ? 'Stock insuficiente para uno o más productos'
        : movError.message
      }
    }

    // ── 4. Complete the sale ───────────────────────────────────────────────────
    const { error: completeError } = await admin
      .from('sales')
      .update({ status: 'completada' })
      .eq('id', saleId)

    if (completeError) return { error: completeError.message }

    return { data: { saleId } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

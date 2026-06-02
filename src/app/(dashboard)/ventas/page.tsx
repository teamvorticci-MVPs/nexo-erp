'use client'

import { useState, useCallback } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Package } from 'lucide-react'
import { useSales, TAX_RATE, type CartItem } from '@/hooks/useSales'
import type { Product, PaymentMethod } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

function stockBadge(p: Product) {
  if (p.stock_quantity === 0)
    return { label: 'Agotado', cls: 'bg-red-100 text-red-600' }
  if (p.stock_quantity <= p.stock_min)
    return { label: `${p.stock_quantity} uds`, cls: 'bg-yellow-100 text-yellow-700' }
  return { label: `${p.stock_quantity} uds`, cls: 'bg-green-100 text-green-700' }
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'transferencia', label: 'Transferencia' },
]

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const stock = stockBadge(product)
  const isOutOfStock = product.stock_quantity === 0

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`group relative flex flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-all sm:p-4 ${
        isOutOfStock
          ? 'cursor-not-allowed border-gray-100 opacity-50'
          : 'cursor-pointer border-[#E5E7EB] hover:border-blue-300 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      {!isOutOfStock && (
        <div className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-blue-500 opacity-0 transition-opacity group-hover:opacity-100 sm:size-6">
          <Plus className="size-3 text-white sm:size-3.5" />
        </div>
      )}

      <p className="pr-5 text-[13px] font-semibold text-gray-900 leading-snug sm:pr-6 sm:text-sm">
        {product.name}
      </p>
      {product.category && (
        <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">{product.category}</p>
      )}

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="text-sm font-bold text-blue-600 sm:text-base">{clp(product.sale_price)}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-xs ${stock.cls}`}>
          {stock.label}
        </span>
      </div>
    </button>
  )
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartRow({
  item,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-gray-900 leading-snug">{item.name}</p>
        <p className="text-xs text-gray-400">{clp(item.unitPrice)} / {item.unit}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onDec}
          className="flex size-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
        >
          <Minus className="size-3" />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-gray-900">
          {item.quantity}
        </span>
        <button
          onClick={onInc}
          className="flex size-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
        >
          <Plus className="size-3" />
        </button>
        <button
          onClick={onRemove}
          className="ml-1 flex size-6 items-center justify-center rounded-md text-gray-300 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <p className="w-16 shrink-0 text-right text-[13px] font-semibold text-gray-900">
        {clp(item.unitPrice * item.quantity)}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MobileTab = 'productos' | 'carrito'

export default function VentasPage() {
  const {
    products,
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
    isRegistering,
    registerError,
    registerSuccess,
    registerSale,
  } = useSales()

  const [mobileTab, setMobileTab] = useState<MobileTab>('productos')

  const handleRegister = useCallback(async () => {
    await registerSale(null)
  }, [registerSale])

  const taxPct = Math.round(TAX_RATE * 100)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    /* Mobile: dvh - 48px mobile header; Desktop: full height */
    <div className="flex h-[calc(100dvh-48px)] flex-col overflow-hidden lg:h-full lg:flex-row">

      {/* ── Mobile tab switcher — hidden on desktop ──────────────────────── */}
      <div className="flex shrink-0 border-b border-gray-200 bg-white lg:hidden">
        <button
          onClick={() => setMobileTab('productos')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'productos'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          <Package className="size-4" />
          Productos
        </button>
        <button
          onClick={() => setMobileTab('carrito')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'carrito'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          <ShoppingCart className="size-4" />
          Carrito
          {cartCount > 0 && (
            <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Left: Products ────────────────────────────────────────────────── */}
      <div
        className={`flex flex-col overflow-hidden lg:flex ${
          mobileTab === 'carrito' ? 'hidden' : 'flex'
        } flex-1`}
      >
        {/* Search */}
        <div className="shrink-0 border-b border-gray-100 bg-[#F9FAFB] p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre, SKU o categoría…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoadingProducts ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
              <Package className="size-10 stroke-[1.5]" />
              <p className="text-sm">
                {search ? 'Sin resultados' : 'No hay productos activos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ───────────────────────────────────────────────────── */}
      <div
        className={`flex flex-col border-gray-200 bg-white lg:flex lg:w-[340px] lg:shrink-0 lg:border-l ${
          mobileTab === 'productos' ? 'hidden' : 'flex flex-1'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Carrito</h2>
            {cart.length > 0 && (
              <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-4 sm:px-5">
          {cart.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-gray-300">
              <ShoppingCart className="size-8 stroke-[1.5]" />
              <p className="text-xs">Selecciona productos del catálogo</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartRow
                key={item.productId}
                item={item}
                onInc={() => setQty(item.productId, item.quantity + 1)}
                onDec={() => setQty(item.productId, item.quantity - 1)}
                onRemove={() => removeFromCart(item.productId)}
              />
            ))
          )}
        </div>

        {/* Footer: totals + payment + button — sticky at bottom */}
        <div className="shrink-0 space-y-3.5 border-t border-gray-100 p-4 sm:p-5">
          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal (neto)</span>
              <span>{clp(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IVA {taxPct}%</span>
              <span>{clp(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
              <span>Total</span>
              <span className="text-base sm:text-lg">{clp(total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  paymentMethod === value
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {registerError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {registerError}
            </div>
          )}
          {registerSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-600">
              <CheckCircle className="size-3.5" />
              Venta registrada correctamente
            </div>
          )}

          {/* Register button */}
          <button
            onClick={handleRegister}
            disabled={cart.length === 0 || isRegistering}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50"
          >
            {isRegistering ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Registrando…
              </>
            ) : (
              <>
                <CheckCircle className="size-4" />
                Registrar venta · {clp(total)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

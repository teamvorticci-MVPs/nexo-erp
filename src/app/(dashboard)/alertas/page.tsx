'use client'

import { useState } from 'react'
import { AlertTriangle, ShoppingCart, CheckCircle, PackageCheck, Loader2 } from 'lucide-react'
import { useAlerts, type AlertRow } from '@/hooks/useAlerts'

function suggestedQty(stockMin: number, stockCurrent: number) {
  return Math.max(1, stockMin * 2 - stockCurrent)
}

function EntryModal({
  productName,
  defaultQty,
  onConfirm,
  onClose,
  isLoading,
  error,
}: {
  productName: string
  defaultQty: number
  onConfirm: (qty: number) => void
  onClose: () => void
  isLoading: boolean
  error: string | null
}) {
  const [qty, setQty] = useState(defaultQty)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-sm sm:rounded-2xl">
        <h3 className="mb-1 text-base font-semibold text-gray-900">Registrar entrada</h3>
        <p className="mb-4 truncate text-sm text-gray-500">{productName}</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Cantidad a ingresar
        </label>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm(qty)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertRow({
  alert,
  onRegister,
}: {
  alert: AlertRow
  onRegister: (productId: string, productName: string, suggested: number) => void
}) {
  const p = alert.products
  const suggested = p ? suggestedQty(alert.stock_min, alert.stock_current) : 1

  const badgeCls =
    alert.level === 'agotado'
      ? 'bg-red-100 text-red-700'
      : alert.level === 'critico'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-yellow-100 text-yellow-700'

  const badgeLabel =
    alert.level === 'agotado' ? 'Agotado' : alert.level === 'critico' ? 'Crítico' : 'Bajo'

  return (
    /* Stacked on mobile, inline on sm+ */
    <li className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-gray-900 sm:text-sm">{p?.name ?? '—'}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
            {badgeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Stock actual: <span className="font-semibold text-gray-600">{alert.stock_current}</span>{' '}
          · Mínimo: <span className="font-semibold text-gray-600">{alert.stock_min}</span>
          {p && (
            <>
              {' '}· Sugerido:{' '}
              <span className="font-semibold text-blue-600">
                +{suggested} {p.unit}
              </span>
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => p && onRegister(p.id, p.name, suggested)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 sm:w-auto sm:shrink-0"
      >
        <PackageCheck className="size-3.5" />
        Registrar entrada
      </button>
    </li>
  )
}

export default function AlertasPage() {
  const { urgent, low, summary, isLoading, error, registerEntry } = useAlerts()

  const [modal, setModal] = useState<{
    productId: string
    productName: string
    defaultQty: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const openModal = (productId: string, productName: string, defaultQty: number) => {
    setSubmitError(null)
    setModal({ productId, productName, defaultQty })
  }

  const handleConfirm = async (qty: number) => {
    if (!modal) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await registerEntry(modal.productId, qty)
    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
    } else {
      setModal(null)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Alertas de stock</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Productos que necesitan reposición</p>
      </div>

      {/* Summary cards — 1 col mobile, 3 col sm+ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-red-700 sm:text-sm">Reponer urgente</span>
            <div className="rounded-lg bg-red-100 p-1.5 sm:p-2">
              <AlertTriangle className="size-3.5 text-red-600 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-700 sm:mt-3">{summary.urgent}</p>
          <p className="mt-1 text-xs text-red-500">productos agotados o críticos</p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-yellow-700 sm:text-sm">Stock bajo</span>
            <div className="rounded-lg bg-yellow-100 p-1.5 sm:p-2">
              <ShoppingCart className="size-3.5 text-yellow-600 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-yellow-700 sm:mt-3">{summary.low}</p>
          <p className="mt-1 text-xs text-yellow-600">productos bajo el mínimo</p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-green-700 sm:text-sm">Normal</span>
            <div className="rounded-lg bg-green-100 p-1.5 sm:p-2">
              <CheckCircle className="size-3.5 text-green-600 sm:size-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-700 sm:mt-3">
            {summary.urgent === 0 && summary.low === 0 ? '✓' : '—'}
          </p>
          <p className="mt-1 text-xs text-green-600">sin alertas activas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-500">{error}</div>
      ) : urgent.length === 0 && low.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <CheckCircle className="size-12 stroke-[1.5] text-green-400" />
          <p className="text-sm font-medium text-green-600">
            Todo el stock está en niveles normales
          </p>
          <p className="text-xs text-gray-400">No hay alertas activas en este momento</p>
        </div>
      ) : (
        <>
          {urgent.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-red-50/50 px-4 py-3 sm:px-5">
                <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                  Reponer urgente
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {urgent.map((a) => (
                  <AlertRow key={a.id} alert={a} onRegister={openModal} />
                ))}
              </ul>
            </div>
          )}

          {low.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-yellow-50/50 px-4 py-3 sm:px-5">
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-600">
                  Stock bajo
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {low.map((a) => (
                  <AlertRow key={a.id} alert={a} onRegister={openModal} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {modal && (
        <EntryModal
          productName={modal.productName}
          defaultQty={modal.defaultQty}
          onConfirm={handleConfirm}
          onClose={() => { setModal(null); setSubmitError(null) }}
          isLoading={submitting}
          error={submitError}
        />
      )}
    </div>
  )
}

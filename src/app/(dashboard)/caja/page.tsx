'use client'

import { useState } from 'react'
import {
  Banknote,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCaja } from '@/hooks/useCaja'

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const PAYMENT_CARDS = [
  { key: 'efectivo' as const, label: 'Efectivo', Icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'debito' as const, label: 'Débito', Icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'credito' as const, label: 'Crédito', Icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'transferencia' as const, label: 'Transferencia', Icon: ArrowLeftRight, color: 'text-orange-600', bg: 'bg-orange-50' },
]

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function OpenCajaPanel({ onOpen }: { onOpen: (balance: number) => Promise<{ error?: string }> }) {
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    const amount = parseFloat(balance.replace(/\./g, '').replace(',', '.')) || 0
    setLoading(true)
    const result = await onOpen(amount)
    setLoading(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12 sm:py-16">
      <div className="rounded-full bg-gray-100 p-5 sm:p-6">
        <Unlock className="size-8 text-gray-400 sm:size-10" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">No hay caja abierta</h2>
        <p className="mt-1 text-sm text-gray-500">Ingresa el efectivo inicial para abrir la caja</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Efectivo inicial</label>
          <input
            type="number"
            min="0"
            placeholder="$0"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className={inputCls}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleOpen}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Unlock className="size-4" />}
          Abrir caja
        </button>
      </div>
    </div>
  )
}

export default function CajaPage() {
  const {
    cashRegister,
    salesByMethod,
    expectedBalance,
    totalSales,
    isLoading,
    error,
    openCaja,
    closeCaja,
  } = useCaja()

  const [efectivoContado, setEfectivoContado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closedSuccess, setClosedSuccess] = useState(false)

  const realBalance = parseFloat(efectivoContado.replace(/\./g, '').replace(',', '.')) || 0
  const diferencia = realBalance - expectedBalance
  const diferenciaColor =
    diferencia === 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-blue-600'

  const handleClose = async () => {
    setIsClosing(true)
    setCloseError(null)
    const result = await closeCaja(realBalance, observaciones)
    setIsClosing(false)
    if (result.error) {
      setCloseError(result.error)
    } else {
      setClosedSuccess(true)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Caja</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {cashRegister
              ? `Abierta el ${format(new Date(cashRegister.opened_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}`
              : 'Sin caja abierta'}
          </p>
        </div>
        {cashRegister && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <Lock className="size-3" />
            Abierta
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 sm:py-20">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-500">{error}</div>
      ) : !cashRegister ? (
        <OpenCajaPanel onOpen={openCaja} />
      ) : closedSuccess ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center sm:py-16">
          <div className="rounded-full bg-green-100 p-5">
            <Lock className="size-10 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Caja cerrada correctamente</h2>
          <p className="text-sm text-gray-500">
            Total registrado: <strong>{clp(totalSales)}</strong>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
          {/* Left: Payment method cards + Summary */}
          <div className="space-y-4 lg:col-span-2 sm:space-y-6">
            {/* Payment method cards — 2x2 on mobile, 4 cols on sm+ */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {PAYMENT_CARDS.map(({ key, label, Icon, color, bg }) => (
                <div
                  key={key}
                  className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <div className={`rounded-lg p-1 sm:p-1.5 ${bg}`}>
                      <Icon className={`size-3 sm:size-3.5 ${color}`} />
                    </div>
                  </div>
                  <p className="mt-2.5 text-base font-bold text-gray-900 sm:mt-3 sm:text-lg">
                    {clp(salesByMethod[key])}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">ventas del día</p>
                </div>
              ))}
            </div>

            {/* Summary panel */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3.5 text-[13px] font-semibold text-gray-900 sm:mb-4 sm:text-sm">
                Resumen de caja
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Saldo inicial</span>
                  <span className="text-sm font-medium text-gray-900">
                    {clp(Number(cashRegister.opening_balance))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Ventas totales</span>
                  <span className="text-sm font-medium text-blue-600">{clp(totalSales)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-700">Caja esperada</span>
                  <span className="text-sm font-bold text-gray-900">{clp(expectedBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Caja real</span>
                  <span className="text-sm font-bold text-gray-900">{clp(realBalance)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-sm font-semibold text-gray-700">Diferencia</span>
                  <span className={`text-sm font-bold ${diferenciaColor}`}>
                    {diferencia === 0
                      ? '$0'
                      : `${diferencia > 0 ? '+' : ''}${clp(diferencia)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Close register — full width on mobile, col on lg */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3.5 flex items-center gap-2 sm:mb-4">
              <Lock className="size-4 text-gray-500" />
              <h2 className="text-[13px] font-semibold text-gray-900 sm:text-sm">Cerrar caja</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Efectivo contado
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">Ingresa el efectivo que hay en caja</p>
              </div>

              {efectivoContado && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    diferencia === 0
                      ? 'bg-green-50 text-green-700'
                      : diferencia < 0
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {diferencia === 0
                    ? '✓ Sin diferencia'
                    : diferencia > 0
                    ? `+${clp(diferencia)} sobrante`
                    : `${clp(diferencia)} faltante`}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  placeholder="Notas opcionales sobre el cierre…"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {closeError && <p className="text-xs text-red-500">{closeError}</p>}

              <button
                onClick={handleClose}
                disabled={isClosing || !efectivoContado}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {isClosing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Cerrar caja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

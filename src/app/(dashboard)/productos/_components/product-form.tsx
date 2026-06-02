'use client'

import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import type { Product } from '@/types/database'
import type { ProductFormData } from '@/hooks/useProducts'

// Schema — no .default() (keeps z.input === z.output for resolver compatibility)
const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  sku: z.string().max(100),
  description: z.string().max(500),
  brand: z.string().max(100),
  category: z.string(),
  unit: z.string().min(1, 'Requerido'),
  cost_price: z.number().min(0, 'Debe ser ≥ 0'),
  sale_price: z.number().min(0, 'Debe ser ≥ 0'),
  stock_quantity: z.number().int().min(0),
  stock_min: z.number().int().min(0),
  stock_max: z.number().int().min(0).nullable().optional(),
  barcode: z.string().max(100),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = [
  'Alimentos secos',
  'Alimentos húmedos',
  'Snacks y premios',
  'Accesorios',
  'Higiene y cuidado',
  'Medicamentos',
  'Otro',
]

const UNITS = ['unidad', 'kg', 'g', 'lb', 'litro', 'ml', 'bolsa', 'caja', 'paquete']

interface Props {
  product: Product | null
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<{ error?: string }>
}

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function ProductForm({ product, onClose, onSave }: Props) {
  const isEdit = product !== null

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: product.name,
          sku: product.sku ?? '',
          description: product.description ?? '',
          brand: product.brand ?? '',
          category: product.category ?? '',
          unit: product.unit,
          cost_price: product.cost_price,
          sale_price: product.sale_price,
          stock_quantity: product.stock_quantity,
          stock_min: product.stock_min,
          stock_max: product.stock_max ?? undefined,
          barcode: product.barcode ?? '',
          active: product.active,
        }
      : {
          name: '',
          sku: '',
          description: '',
          brand: '',
          category: '',
          unit: 'unidad',
          cost_price: 0,
          sale_price: 0,
          stock_quantity: 0,
          stock_min: 5,
          stock_max: null,
          barcode: '',
          active: true,
        },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const result = await onSave({
      name: values.name,
      sku: values.sku ?? '',
      description: values.description ?? '',
      brand: values.brand ?? '',
      category: values.category ?? '',
      unit: values.unit,
      cost_price: values.cost_price,
      sale_price: values.sale_price,
      stock_quantity: values.stock_quantity,
      stock_min: values.stock_min,
      stock_max: typeof values.stock_max === 'number' ? values.stock_max : null,
      barcode: values.barcode ?? '',
      active: values.active,
    })
    if (result?.error) {
      setError('root', { message: result.error })
      return
    }
    onClose()
  }

  return (
    /* Bottom sheet on mobile, centered modal on sm+ */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        {/* Header — sticky */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-5">
            {/* Nombre + SKU — 1 col mobile, 2 col sm+ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre *" error={errors.name?.message}>
                <input {...register('name')} placeholder="Royal Canin Adult 15kg" className={inputCls} />
              </Field>
              <Field label="SKU" error={errors.sku?.message}>
                <input {...register('sku')} placeholder="RC-AD-15" className={inputCls} />
              </Field>
            </div>

            {/* Marca + Categoría */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Marca" error={errors.brand?.message}>
                <input {...register('brand')} placeholder="Royal Canin" className={inputCls} />
              </Field>
              <Field label="Categoría" error={errors.category?.message}>
                <select {...register('category')} className={inputCls}>
                  <option value="">Seleccionar…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Precios + Unidad */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Precio compra *" error={errors.cost_price?.message}>
                <input
                  {...register('cost_price', { valueAsNumber: true })}
                  type="number" min="0" step="1" placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Precio venta *" error={errors.sale_price?.message}>
                <input
                  {...register('sale_price', { valueAsNumber: true })}
                  type="number" min="0" step="1" placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Unidad" error={errors.unit?.message}>
                <select {...register('unit')} className={inputCls}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Stock actual" error={errors.stock_quantity?.message}>
                <input
                  {...register('stock_quantity', { valueAsNumber: true })}
                  type="number" min="0" step="1" placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Stock mínimo" error={errors.stock_min?.message}>
                <input
                  {...register('stock_min', { valueAsNumber: true })}
                  type="number" min="0" step="1" placeholder="5"
                  className={inputCls}
                />
              </Field>
              <Field label="Stock máximo (opcional)" error={errors.stock_max?.message}>
                <input
                  {...register('stock_max', {
                    setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
                  })}
                  type="number" min="0" step="1" placeholder="—"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Código de barras" error={errors.barcode?.message}>
              <input {...register('barcode')} placeholder="7500000000000" className={`${inputCls} sm:max-w-xs`} />
            </Field>

            <Field label="Descripción" error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Descripción opcional del producto…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                {...register('active')}
                type="checkbox"
                className="size-4 rounded border-gray-300 accent-blue-500"
              />
              <span className="text-sm text-gray-700">Producto activo</span>
            </label>

            {errors.root && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

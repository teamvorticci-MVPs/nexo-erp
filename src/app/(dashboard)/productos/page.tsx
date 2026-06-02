'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useProducts, type ProductFormData } from '@/hooks/useProducts'
import ProductForm from './_components/product-form'
import type { Product } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

function stockStatus(p: Product) {
  if (p.stock_quantity === 0)
    return { label: 'Agotado', cls: 'bg-red-100 text-red-700' }
  if (p.stock_quantity <= p.stock_min)
    return { label: 'Bajo', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Normal', cls: 'bg-green-100 text-green-700' }
}

// ─── Row actions dropdown ──────────────────────────────────────────────────────

function RowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => { onEdit(product); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="size-3.5" />
            Editar
          </button>
          <button
            onClick={() => { onDelete(product.id); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Mobile product card ───────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
}) {
  const s = stockStatus(product)
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-gray-900">{product.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
            {s.label}
          </span>
        </div>
        {product.sku && (
          <p className="mt-0.5 text-[11px] text-gray-400">SKU: {product.sku}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {product.category && <span>{product.category}</span>}
          <span>Venta: <strong className="text-gray-900">{clp(product.sale_price)}</strong></span>
          <span>Stock: <strong className="text-gray-900">{product.stock_quantity}</strong></span>
        </div>
      </div>
      <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Product>()

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const { products, isLoading, error, createProduct, updateProduct, deleteProduct } = useProducts()
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        [p.name, p.sku, p.category, p.brand].some((v) =>
          v?.toLowerCase().includes(search.toLowerCase()),
        ),
      ),
    [products, search],
  )

  const handleEdit = useCallback((p: Product) => {
    setEditing(p)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
      await deleteProduct(id)
    },
    [deleteProduct],
  )

  const handleSave = useCallback(
    (data: ProductFormData) => {
      if (editing) return updateProduct(editing.id, data)
      return createProduct(data)
    },
    [editing, createProduct, updateProduct],
  )

  const columns = useMemo(
    () => [
      colHelper.accessor('name', {
        header: 'Nombre',
        cell: (info) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{info.getValue()}</p>
            {info.row.original.sku && (
              <p className="text-xs text-gray-400">SKU: {info.row.original.sku}</p>
            )}
          </div>
        ),
      }),
      colHelper.accessor('category', {
        header: 'Categoría',
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue() ?? '—'}</span>
        ),
      }),
      colHelper.accessor('cost_price', {
        header: 'P. Compra',
        cell: (info) => <span className="text-sm text-gray-900">{clp(info.getValue())}</span>,
      }),
      colHelper.accessor('sale_price', {
        header: 'P. Venta',
        cell: (info) => (
          <span className="text-sm font-medium text-gray-900">{clp(info.getValue())}</span>
        ),
      }),
      colHelper.accessor('margin_pct', {
        header: 'Margen',
        cell: (info) => (
          <span className="text-sm font-semibold text-green-600">
            {Number(info.getValue()).toFixed(1)}%
          </span>
        ),
      }),
      colHelper.accessor('stock_quantity', {
        header: 'Stock',
        cell: (info) => (
          <span className="text-sm text-gray-900">{info.getValue()}</span>
        ),
      }),
      colHelper.display({
        id: 'status',
        header: 'Estado',
        cell: (info) => {
          const s = stockStatus(info.row.original)
          return (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
              {s.label}
            </span>
          )
        },
      }),
      colHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <RowActions
            product={info.row.original}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ),
      }),
    ],
    [handleEdit, handleDelete],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {products.length} {products.length === 1 ? 'producto' : 'productos'} en catálogo
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 sm:w-auto"
        >
          <Plus className="size-4" />
          Nuevo producto
        </button>
      </div>

      {/* Buscador — full width on mobile */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, SKU, categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Loading / error / empty */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <Package className="size-10 stroke-[1.5]" />
          <p className="text-sm">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay productos aún'}
          </p>
          {!search && (
            <button
              onClick={() => { setEditing(null); setFormOpen(true) }}
              className="text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              Crear primer producto
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on mobile */}
          <div className="hidden overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-gray-100 bg-gray-50/60">
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          onClick={h.column.getToggleSortingHandler()}
                          className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                            h.column.getCanSort()
                              ? 'cursor-pointer select-none hover:text-gray-700'
                              : ''
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {h.column.getIsSorted() === 'asc' && (
                              <ChevronUp className="size-3" />
                            )}
                            {h.column.getIsSorted() === 'desc' && (
                              <ChevronDown className="size-3" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${
                        i === table.getRowModel().rows.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — hidden on desktop */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {formOpen && (
        <ProductForm
          product={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft, Users, Package, TrendingUp,
  CheckCircle, XCircle, Loader2, Edit2, Save, X, ImageIcon, Upload,
} from 'lucide-react'
import Link from 'next/link'
import {
  getTenant, getTenantProducts, toggleTenantStatus, updateTenantInfo, uploadTenantLogo,
  type TenantDetail, type ProductRow,
} from '@/app/actions/superadmin'
import type { User } from '@/types/database'
import ProductImport from './_components/product-import'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const editSchema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  phone:   z.string().nullish(),
  address: z.string().nullish(),
})
type EditForm = z.infer<typeof editSchema>

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'info' | 'productos' | 'usuarios'

const TABS: { key: Tab; label: string }[] = [
  { key: 'info',      label: 'Información' },
  { key: 'productos', label: 'Productos'   },
  { key: 'usuarios',  label: 'Usuarios'    },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function LogoUpload({
  tenantId,
  currentUrl,
  onUploaded,
}: {
  tenantId: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('El archivo no puede superar los 2 MB')
      return
    }

    setUploadError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const r = await uploadTenantLogo(tenantId, file)
    setUploading(false)

    if (r.error) {
      setUploadError(r.error)
      setPreview(currentUrl)
      return
    }

    onUploaded(r.data!.logo_url)
  }

  return (
    <div className="mb-5 flex items-center gap-4 border-b border-gray-100 pb-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-blue-400 hover:bg-blue-50"
      >
        {preview ? (
          <img src={preview} alt="Logo" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-gray-300" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-4 animate-spin text-blue-500" />
          </div>
        )}
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50"
        >
          <Upload className="size-3.5" />
          {preview ? 'Cambiar logo' : 'Subir logo'}
        </button>
        <p className="mt-0.5 text-xs text-gray-400">PNG, JPG o SVG · máx. 2 MB</p>
        {uploadError && <p className="mt-0.5 text-xs text-red-500">{uploadError}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [detail, setDetail]         = useState<TenantDetail | null>(null)
  const [products, setProducts]     = useState<ProductRow[]>([])
  const [loadingMain, setLoadingMain]   = useState(true)
  const [loadingProds, setLoadingProds] = useState(false)
  const [mainError, setMainError]   = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>('info')

  const [isEditing, setIsEditing]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [toggling, setToggling]     = useState(false)
  const [, startSave] = useTransition()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<EditForm>({ resolver: zodResolver(editSchema) })

  // Load tenant detail
  useEffect(() => {
    setLoadingMain(true)
    getTenant(id).then(r => {
      setLoadingMain(false)
      if (r.error || !r.data) { setMainError(r.error ?? 'Sin datos'); return }
      setDetail(r.data)
      const t = r.data.tenant
      reset({ name: t.name, email: t.email, phone: t.phone ?? '', address: t.address ?? '' })
    })
  }, [id])

  // Load products when tab switches
  useEffect(() => {
    if (activeTab !== 'productos' || products.length) return
    setLoadingProds(true)
    getTenantProducts(id).then(r => {
      setLoadingProds(false)
      if (!r.error) setProducts(r.data ?? [])
    })
  }, [activeTab])

  const handleToggle = async () => {
    if (!detail) return
    setToggling(true)
    await toggleTenantStatus(detail.tenant.id, !detail.tenant.active)
    setDetail(prev => prev ? { ...prev, tenant: { ...prev.tenant, active: !prev.tenant.active } } : prev)
    setToggling(false)
  }

  const onSave = (data: EditForm) => {
    setSaveError(null)
    startSave(async () => {
      const r = await updateTenantInfo(id, data)
      if (r.error) { setSaveError(r.error); return }
      setDetail(prev => prev ? { ...prev, tenant: { ...prev.tenant, ...data } } : prev)
      setIsEditing(false)
    })
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loadingMain) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-blue-500" /></div>
  }
  if (mainError || !detail) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{mainError ?? 'Tenant no encontrado'}</div>
      </div>
    )
  }

  const { tenant, users, product_count, total_sales } = detail

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Back + header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/tenants" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="size-4" /> Volver
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5">
            {tenant.logo_url
              ? <img src={tenant.logo_url} alt="" className="size-9 rounded-md object-cover" />
              : <div className="flex size-9 items-center justify-center rounded-md bg-blue-100 text-sm font-bold text-blue-700">{tenant.name.slice(0,2).toUpperCase()}</div>
            }
            <div>
              <h1 className="text-lg font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-[12px] text-gray-400">Desde {format(new Date(tenant.created_at), "d 'de' MMMM yyyy", { locale: es })}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${tenant.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
        >
          {toggling ? <Loader2 className="size-4 animate-spin" /> : tenant.active ? <XCircle className="size-4" /> : <CheckCircle className="size-4" />}
          {tenant.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Estado',    value: tenant.active ? 'Activo' : 'Inactivo', Icon: tenant.active ? CheckCircle : XCircle, c: tenant.active ? 'text-green-600' : 'text-red-500', bg: tenant.active ? 'bg-green-50' : 'bg-red-50' },
          { label: 'Usuarios',  value: users.length,  Icon: Users,    c: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Productos', value: product_count, Icon: Package,  c: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Ventas',    value: fmt(total_sales), Icon: TrendingUp, c: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, Icon, c, bg }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <div className={`rounded-lg p-1.5 ${bg}`}><Icon className={`size-3.5 ${c}`} /></div>
            </div>
            <p className="mt-2.5 text-base font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`shrink-0 border-b-2 px-5 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Info ─────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">

          <LogoUpload
            tenantId={id}
            currentUrl={tenant.logo_url ?? null}
            onUploaded={(url) =>
              setDetail(prev => prev ? { ...prev, tenant: { ...prev.tenant, logo_url: url } } : prev)
            }
          />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Información del negocio</h2>
            {!isEditing
              ? <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50"><Edit2 className="size-3.5" />Editar</button>
              : <button onClick={() => { setIsEditing(false); setSaveError(null) }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-100"><X className="size-3.5" />Cancelar</button>
            }
          </div>

          {!isEditing ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { l: 'Nombre',    v: tenant.name },
                { l: 'Email',     v: tenant.email },
                { l: 'Teléfono',  v: tenant.phone ?? '—' },
                { l: 'Dirección', v: tenant.address ?? '—' },
                { l: 'Slug',      v: tenant.slug },
                { l: 'Estado',    v: <StatusBadge active={tenant.active} /> },
              ].map(({ l, v }) => (
                <div key={l}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{l}</dt>
                  <dd className="mt-0.5 text-[13px] text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                  <input {...register('name')} className={inputCls} />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" {...register('email')} className={inputCls} />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input {...register('phone')} className={inputCls} placeholder="+56 9 …" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
                  <input {...register('address')} className={inputCls} placeholder="Av. Principal 123" />
                </div>
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Tab: Productos ────────────────────────────────────────────────── */}
      {activeTab === 'productos' && (
        <div className="space-y-4">
          {/* Product list */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Catálogo <span className="ml-1 text-[12px] font-normal text-gray-400">({product_count} productos)</span>
              </h2>
            </div>

            {loadingProds ? (
              <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-blue-400" /></div>
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">Sin productos. Importa desde Excel abajo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Nombre', 'Categoría', 'SKU', 'Precio venta', 'Stock', 'Estado'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2.5 text-gray-500">{p.category ?? '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.sku ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-900">{fmt(p.sale_price)}</td>
                        <td className="px-4 py-2.5 text-gray-900">{p.stock_quantity}</td>
                        <td className="px-4 py-2.5"><StatusBadge active={p.active} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Import */}
          <ProductImport
            tenantId={id}
            onImported={(count) => {
              setProducts([])
              setDetail(prev => prev ? { ...prev, product_count: prev.product_count + count } : prev)
            }}
          />
        </div>
      )}

      {/* ── Tab: Usuarios ─────────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          {users.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">Sin usuarios registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Creado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(users as User[]).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><StatusBadge active={u.active} /></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(u.created_at), 'd MMM yyyy', { locale: es })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  )
}

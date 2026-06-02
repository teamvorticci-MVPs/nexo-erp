'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeft,
  Building2,
  Users,
  Package,
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  Edit2,
  Save,
  X,
  Upload,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { getTenant, toggleTenantStatus, updateTenantInfo } from '@/app/actions/superadmin'
import type { Tenant, User } from '@/types/database'
import ProductImport from './_components/product-import'

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const editSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

type EditFormData = z.infer<typeof editSchema>

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function UserRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
        role === 'admin'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {role}
    </span>
  )
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [productCount, setProductCount] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [, startSave] = useTransition()

  const [togglingStatus, setTogglingStatus] = useState(false)

  const [activeTab, setActiveTab] = useState<'info' | 'usuarios' | 'importar'>('info')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  const load = async () => {
    setIsLoading(true)
    const result = await getTenant(id)
    setIsLoading(false)
    if (result.error || !result.data) {
      setLoadError(result.error ?? 'Sin datos')
      return
    }
    const { tenant, users, product_count, total_sales } = result.data
    setTenant(tenant)
    setUsers(users)
    setProductCount(product_count)
    setTotalSales(total_sales)
    reset({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? '',
      address: tenant.address ?? '',
    })
  }

  useEffect(() => { load() }, [id])

  const onSave = (data: EditFormData) => {
    setSaveError(null)
    startSave(async () => {
      const result = await updateTenantInfo(id, data)
      if (result.error) {
        setSaveError(result.error)
      } else {
        setTenant((prev) => prev ? { ...prev, ...data } : prev)
        setIsEditing(false)
      }
    })
  }

  const handleToggle = async () => {
    if (!tenant) return
    setTogglingStatus(true)
    await toggleTenantStatus(tenant.id, !tenant.active)
    setTenant((prev) => prev ? { ...prev, active: !prev.active } : prev)
    setTogglingStatus(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (loadError || !tenant) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {loadError ?? 'Tenant no encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Back + header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="size-9 rounded-md object-cover" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-md bg-blue-100 text-sm font-bold text-blue-700">
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-[12px] text-gray-400">
                Registrado {format(new Date(tenant.created_at), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={togglingStatus}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${
            tenant.active
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {togglingStatus ? (
            <Loader2 className="size-4 animate-spin" />
          ) : tenant.active ? (
            <XCircle className="size-4" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          {tenant.active ? 'Desactivar cliente' : 'Activar cliente'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: 'Estado', value: tenant.active ? 'Activo' : 'Inactivo', Icon: tenant.active ? CheckCircle : XCircle, color: tenant.active ? 'text-green-600' : 'text-red-500', bg: tenant.active ? 'bg-green-50' : 'bg-red-50' },
          { label: 'Usuarios', value: users.length, Icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Productos', value: productCount, Icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Ventas totales', value: clp(totalSales), Icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <div className={`rounded-lg p-1 sm:p-1.5 ${bg}`}>
                <Icon className={`size-3 sm:size-3.5 ${color}`} />
              </div>
            </div>
            <p className="mt-2.5 text-base font-bold text-gray-900 sm:text-lg">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {(['info', 'usuarios', 'importar'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab === 'info' ? 'Información' : tab === 'usuarios' ? 'Usuarios' : 'Importar productos'}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Información del negocio</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Edit2 className="size-3.5" />
                Editar
              </button>
            ) : (
              <button
                onClick={() => { setIsEditing(false); setSaveError(null) }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="size-3.5" />
                Cancelar
              </button>
            )}
          </div>

          {!isEditing ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { label: 'Nombre', value: tenant.name },
                { label: 'Email', value: tenant.email },
                { label: 'Teléfono', value: tenant.phone ?? '—' },
                { label: 'Dirección', value: tenant.address ?? '—' },
                { label: 'Slug', value: tenant.slug },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="mt-0.5 text-[13px] text-gray-900">{value}</dd>
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
                  <input {...register('phone')} className={inputCls} placeholder="+56 9 1234 5678" />
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
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar cambios
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab: Usuarios */}
      {activeTab === 'usuarios' && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          {users.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">Sin usuarios registrados</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Creado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <UserRoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {format(new Date(u.created_at), 'd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Importar productos */}
      {activeTab === 'importar' && (
        <ProductImport tenantId={id} />
      )}
    </div>
  )
}

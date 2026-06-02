'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft, Building2, User, Loader2, CheckCircle } from 'lucide-react'
import { createTenantWithAdmin, type CreateTenantInput } from '@/app/actions/superadmin'

const schema = z.object({
  tenantName:    z.string().min(2, 'Mínimo 2 caracteres').max(100),
  tipoNegocio:   z.string().optional(),
  adminEmail:    z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  adminFullName: z.string().min(2, 'Nombre requerido').max(80),
  phone:         z.string().nullish(),
  address:       z.string().nullish(),
  city:          z.string().nullish(),
  country:       z.string().nullish(),
  currency:      z.string().nullish(),
})

type FormData = z.infer<typeof schema>

const inp =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TIPOS = [
  'Retail / Tienda', 'Restaurante / Cafetería', 'Ferretería', 'Farmacia',
  'Peluquería / Estética', 'Librería / Papelería', 'Distribuidora', 'Servicios', 'Otro',
]

const CURRENCIES = [
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar (USD)' },
]

export default function NewTenantPage() {
  const router = useRouter()
  const [srvError, setSrvError] = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [, start] = useTransition()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { country: 'Chile', currency: 'CLP' },
    })

  const onSubmit = (data: FormData) => {
    setSrvError(null)
    start(async () => {
      const r = await createTenantWithAdmin(data as CreateTenantInput)
      if (r.error || !r.data) { setSrvError(r.error ?? 'Error desconocido'); return }
      setSuccess(`Cliente creado. ID: ${r.data.tenantId}`)
      reset()
      setTimeout(() => router.push('/superadmin/tenants'), 1500)
    })
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/superadmin/tenants" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle className="size-5 shrink-0 text-green-500" />
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* Datos del negocio */}
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building2 className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Datos del negocio</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del negocio <span className="text-red-500">*</span></label>
              <input {...register('tenantName')} className={inp} placeholder="Mi Tienda" />
              {errors.tenantName && <p className="mt-1 text-xs text-red-500">{errors.tenantName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de negocio</label>
              <select {...register('tipoNegocio')} className={inp}>
                <option value="">Seleccionar…</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input {...register('phone')} className={inp} placeholder="+56 9 1234 5678" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
              <input {...register('address')} className={inp} placeholder="Av. Principal 123" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ciudad</label>
              <input {...register('city')} className={inp} placeholder="Santiago" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">País</label>
              <input {...register('country')} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
              <select {...register('currency')} className={inp}>
                {CURRENCIES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Cuenta del admin */}
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
            <User className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Cuenta del administrador</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo <span className="text-red-500">*</span></label>
              <input {...register('adminFullName')} className={inp} placeholder="Juan Pérez" />
              {errors.adminFullName && <p className="mt-1 text-xs text-red-500">{errors.adminFullName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
              <input type="email" {...register('adminEmail')} className={inp} placeholder="admin@negocio.cl" />
              {errors.adminEmail && <p className="mt-1 text-xs text-red-500">{errors.adminEmail.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña temporal <span className="text-red-500">*</span></label>
              <input type="password" {...register('adminPassword')} className={inp} placeholder="Mínimo 8 caracteres" />
              {errors.adminPassword && <p className="mt-1 text-xs text-red-500">{errors.adminPassword.message}</p>}
              <p className="mt-1 text-[11px] text-gray-400">El administrador deberá cambiarla en su primer inicio de sesión.</p>
            </div>
          </div>
        </section>

        {srvError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{srvError}</div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/superadmin/tenants"
            className="flex w-full items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:w-auto"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Creando…</> : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

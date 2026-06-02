'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  User,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { createTenantWithAdmin, type CreateTenantInput } from '@/app/actions/superadmin'

const schema = z.object({
  tenantName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  tipoNegocio: z.string().optional(),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  adminFullName: z.string().min(2, 'Ingresa el nombre completo').max(80),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TIPOS_NEGOCIO = [
  'Retail / Tienda',
  'Restaurante / Cafetería',
  'Ferretería',
  'Farmacia',
  'Peluquería / Estética',
  'Librería / Papelería',
  'Distribuidora',
  'Servicios',
  'Otro',
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
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Chile', currency: 'CLP' },
  })

  const onSubmit = (data: FormData) => {
    setServerError(null)
    startTransition(async () => {
      const result = await createTenantWithAdmin(data as CreateTenantInput)
      if (result.error || !result.data) {
        setServerError(result.error ?? 'Error desconocido')
      } else {
        setSuccess(`Cliente creado correctamente. ID: ${result.data.tenantId}`)
        reset()
        setTimeout(() => router.push('/superadmin/dashboard'), 1500)
      }
    })
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
      </div>

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-500" />
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Sección: Datos del negocio */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Datos del negocio</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del negocio <span className="text-red-500">*</span>
              </label>
              <input {...register('tenantName')} className={inputCls} placeholder="Mi Tienda" />
              {errors.tenantName && <p className="mt-1 text-xs text-red-500">{errors.tenantName.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de negocio</label>
              <select {...register('tipoNegocio')} className={inputCls}>
                <option value="">Seleccionar…</option>
                {TIPOS_NEGOCIO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
              <input {...register('phone')} className={inputCls} placeholder="+56 9 1234 5678" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
              <input {...register('address')} className={inputCls} placeholder="Av. Principal 123" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Ciudad</label>
              <input {...register('city')} className={inputCls} placeholder="Santiago" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">País</label>
              <input {...register('country')} className={inputCls} placeholder="Chile" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
              <select {...register('currency')} className={inputCls}>
                {CURRENCIES.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección: Datos del admin */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <User className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Cuenta del administrador</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input {...register('adminFullName')} className={inputCls} placeholder="Juan Pérez" />
              {errors.adminFullName && <p className="mt-1 text-xs text-red-500">{errors.adminFullName.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" {...register('adminEmail')} className={inputCls} placeholder="admin@negocio.cl" />
              {errors.adminEmail && <p className="mt-1 text-xs text-red-500">{errors.adminEmail.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contraseña temporal <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                {...register('adminPassword')}
                className={inputCls}
                placeholder="Mínimo 8 caracteres"
              />
              {errors.adminPassword && <p className="mt-1 text-xs text-red-500">{errors.adminPassword.message}</p>}
              <p className="mt-1 text-[11px] text-gray-400">
                El administrador deberá cambiar esta contraseña en su primer inicio de sesión.
              </p>
            </div>
          </div>
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/superadmin/dashboard"
            className="flex w-full items-center justify-center rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando…
              </>
            ) : (
              'Crear cliente'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

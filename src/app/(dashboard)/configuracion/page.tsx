'use client'

import { useState, useTransition, useRef } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2,
  Users,
  Receipt,
  CheckCircle,
  Loader2,
  X,
  UserPlus,
  Shield,
  Upload,
  Boxes,
} from 'lucide-react'
import { useConfig, type TenantFormData } from '@/hooks/useConfig'
import { inviteUser } from '@/app/actions/users'
import type { User } from '@/types/database'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const selectCls = inputCls + ' cursor-pointer'

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-gray-700">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Business tab schema ──────────────────────────────────────────────────────

const businessSchema = z.object({
  name: z.string().min(2, 'Requerido').max(100),
  tipo_negocio: z.string().max(50),
  cuit: z.string().max(30),
  address: z.string().max(200),
  city: z.string().max(100),
  pais: z.string().max(50),
  phone: z.string().max(20),
  email_contacto: z
    .string()
    .max(100)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email inválido'),
  sitio_web: z.string().max(200),
  moneda: z.enum(['CLP', 'ARS', 'USD', 'EUR', 'MXN', 'COP']),
})

type BusinessFormValues = z.infer<typeof businessSchema>

// ─── Invite schema ────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  fullName: z.string().min(2, 'Nombre requerido').max(80),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'vendedor'] as const),
})

type InviteFormValues = z.infer<typeof inviteSchema>

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({
  tenantId,
  onClose,
  onSuccess,
}: {
  tenantId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'vendedor' },
  })

  const onSubmit: SubmitHandler<InviteFormValues> = (values) => {
    setServerError(null)
    startTransition(async () => {
      const result = await inviteUser(values.email, values.fullName, values.role, tenantId)
      if (result.error) {
        setServerError(result.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-900">Invitar usuario</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 px-5 py-4">
          <Field label="Nombre completo" error={errors.fullName?.message}>
            <input {...register('fullName')} placeholder="María González" className={inputCls} />
          </Field>
          <Field label="Correo electrónico" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="maria@negocio.cl" className={inputCls} />
          </Field>
          <Field label="Rol" error={errors.role?.message}>
            <select {...register('role')} className={selectCls}>
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>

          {serverError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Invitar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({ user }: { user: User }) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-gray-900">{user.full_name}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          user.role === 'admin'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {user.role === 'admin' && <Shield className="size-3" />}
        {user.role === 'admin' ? 'Admin' : 'Vendedor'}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'negocio' | 'usuarios' | 'impuestos'

const TABS: { value: Tab; label: string; Icon: React.ElementType }[] = [
  { value: 'negocio', label: 'Negocio', Icon: Building2 },
  { value: 'usuarios', label: 'Usuarios', Icon: Users },
  { value: 'impuestos', label: 'Impuestos', Icon: Receipt },
]

const TIPO_NEGOCIO_OPTIONS = [
  'Tienda mascotas',
  'Ferretería',
  'Minimarket',
  'Farmacia',
  'Librería',
  'Otro',
]

export default function ConfiguracionPage() {
  const {
    tenant,
    defaultFormValues,
    users,
    isLoadingUsers,
    isSaving,
    saveError,
    saveSuccess,
    updateTenant,
    uploadLogo,
    refetchUsers,
  } = useConfig()

  const [activeTab, setActiveTab] = useState<Tab>('negocio')
  const [showInvite, setShowInvite] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant?.logo_url ?? null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Business form ───────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    values: defaultFormValues as BusinessFormValues,
  })

  const onSaveBusiness: SubmitHandler<BusinessFormValues> = async (values) => {
    await updateTenant(values as TenantFormData)
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)

    setIsUploadingLogo(true)
    const result = await uploadLogo(file)
    setIsUploadingLogo(false)

    if (result.error) {
      setLogoError(result.error)
      setLogoPreview(tenant?.logo_url ?? null)
    }
  }

  // ── Initials for tenant avatar ──────────────────────────────────────────────
  const tenantInitials = (tenant?.name ?? 'N')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Ajusta tu negocio y usuarios</p>
      </div>

      {/* Tabs — scroll horizontal on mobile */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-fit">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              activeTab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Negocio ─────────────────────────────────────────────────────── */}
      {activeTab === 'negocio' && (
        <div className="max-w-2xl rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          {/* Logo section */}
          <div className="mb-5 flex items-center gap-4">
            <div className="relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="size-16 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-xl bg-blue-500">
                  <Boxes className="size-7 text-white" />
                </div>
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{tenant?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{tenant?.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="mt-1.5 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                <Upload className="size-3" />
                {isUploadingLogo ? 'Subiendo…' : 'Cambiar logo'}
              </button>
              {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />

          <form onSubmit={handleSubmit(onSaveBusiness)} className="space-y-3.5">
            {/* Row 1: nombre + tipo */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Nombre del negocio *" error={errors.name?.message}>
                <input {...register('name')} placeholder="Mi Negocio" className={inputCls} />
              </Field>
              <Field label="Tipo de negocio" error={errors.tipo_negocio?.message}>
                <select {...register('tipo_negocio')} className={selectCls}>
                  <option value="">Seleccionar…</option>
                  {TIPO_NEGOCIO_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Row 2: cuit */}
            <Field label="CUIT / RUT / Identificador fiscal" error={errors.cuit?.message}>
              <input {...register('cuit')} placeholder="20-12345678-9" className={inputCls} />
            </Field>

            {/* Row 3: address */}
            <Field label="Dirección completa" error={errors.address?.message}>
              <input {...register('address')} placeholder="Av. Principal 123" className={inputCls} />
            </Field>

            {/* Row 4: ciudad + país */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Ciudad" error={errors.city?.message}>
                <input {...register('city')} placeholder="Santiago" className={inputCls} />
              </Field>
              <Field label="País" error={errors.pais?.message}>
                <input {...register('pais')} placeholder="Chile" className={inputCls} />
              </Field>
            </div>

            {/* Row 5: teléfono + email contacto */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Teléfono" error={errors.phone?.message}>
                <input {...register('phone')} placeholder="+56 9 1234 5678" className={inputCls} />
              </Field>
              <Field label="Email de contacto" error={errors.email_contacto?.message}>
                <input
                  {...register('email_contacto')}
                  type="email"
                  placeholder="contacto@negocio.cl"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Row 6: sitio web + moneda */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Sitio web (opcional)" error={errors.sitio_web?.message}>
                <input
                  {...register('sitio_web')}
                  placeholder="https://minegocio.cl"
                  className={inputCls}
                />
              </Field>
              <Field label="Moneda" error={errors.moneda?.message}>
                <select {...register('moneda')} className={selectCls}>
                  <option value="CLP">CLP — Peso chileno</option>
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="COP">COP — Peso colombiano</option>
                </select>
              </Field>
            </div>

            {saveError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-600">
                <CheckCircle className="size-3.5" />
                Cambios guardados correctamente
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:opacity-60 sm:w-auto"
              >
                {isSaving && <Loader2 className="size-3.5 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab: Usuarios ────────────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <div className="max-w-2xl rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-gray-900">Equipo</h2>
              <p className="text-xs text-gray-400">{users.length} usuario{users.length !== 1 && 's'}</p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-600"
            >
              <UserPlus className="size-3.5" />
              Invitar usuario
            </button>
          </div>

          <div className="divide-y divide-gray-50 px-4">
            {isLoadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-gray-400">No hay usuarios activos</p>
            ) : (
              users.map((u) => <UserRow key={u.id} user={u} />)
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Impuestos ───────────────────────────────────────────────────── */}
      {activeTab === 'impuestos' && (
        <div className="max-w-2xl rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900">Configuración fiscal</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Tasas impositivas aplicadas a las ventas
            </p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-700">
            La tasa de IVA actualmente configurada es <strong>19%</strong> (Chile).
          </div>

          <div className="max-w-xs">
            <label className="mb-1 block text-[13px] font-medium text-gray-700">
              Tasa de IVA (%)
            </label>
            <input
              type="number"
              defaultValue={19}
              min={0}
              max={100}
              step={0.1}
              className={inputCls}
              disabled
            />
            <p className="mt-1 text-xs text-gray-400">
              Modificación de tasas disponible en versiones futuras
            </p>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && tenant && (
        <InviteModal
          tenantId={tenant.id}
          onClose={() => setShowInvite(false)}
          onSuccess={refetchUsers}
        />
      )}
    </div>
  )
}

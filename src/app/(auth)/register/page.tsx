'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Boxes, Loader2 } from 'lucide-react'
import { signUp } from '@/app/actions/auth'

const schema = z.object({
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(80, 'Nombre demasiado largo'),
  tenantName: z
    .string()
    .min(2, 'Ingresa el nombre de tu negocio')
    .max(100, 'Nombre demasiado largo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormData = z.infer<typeof schema>

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormData) => {
    setServerError(null)
    startTransition(async () => {
      const result = await signUp(
        data.email,
        data.password,
        data.fullName,
        data.tenantName,
      )
      if (result?.error) setServerError(result.error)
    })
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#F9FAFB] sm:items-center sm:px-4 sm:py-10">
      <div className="w-full bg-white px-6 py-10 sm:max-w-md sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:p-8 sm:shadow-sm">
        {/* Logo */}
        <div className="mb-7 flex flex-col items-center gap-2 sm:mb-8">
          <div className="flex items-center gap-2">
            <Boxes className="size-6 text-blue-500 sm:size-7" />
            <span className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Nexo</span>
          </div>
          <p className="text-sm text-gray-500">Gestión inteligente para tu negocio</p>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-gray-900 sm:text-xl">Crear cuenta</h1>
        <p className="mb-6 text-sm text-gray-500">
          Completa los datos para registrar tu negocio
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field id="fullName" label="Tu nombre completo" error={errors.fullName?.message}>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Juan Pérez"
              {...register('fullName')}
              className={inputClass}
            />
          </Field>

          <Field id="tenantName" label="Nombre de tu negocio" error={errors.tenantName?.message}>
            <input
              id="tenantName"
              type="text"
              autoComplete="organization"
              placeholder="Mi Negocio"
              {...register('tenantName')}
              className={inputClass}
            />
          </Field>

          <Field id="email" label="Correo electrónico" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@negocio.cl"
              {...register('email')}
              className={inputClass}
            />
          </Field>

          <Field id="password" label="Contraseña" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
              className={inputClass}
            />
          </Field>

          {serverError && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando tu negocio…
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

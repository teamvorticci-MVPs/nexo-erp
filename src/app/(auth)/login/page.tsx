'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Boxes, Loader2 } from 'lucide-react'
import { signIn } from '@/app/actions/auth'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

// ─── Inner form — uses useSearchParams, must be inside <Suspense> ─────────────

function LoginForm() {
  const searchParams = useSearchParams()
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
      const result = await signIn(data.email, data.password)
      if (result?.error) setServerError(result.error)
    })
  }

  const justRegistered = searchParams.get('registered') === 'true'

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-gray-900 sm:text-xl">
        Bienvenido de vuelta
      </h1>
      <p className="mb-6 text-sm text-gray-500">Ingresa a tu cuenta para continuar</p>

      {justRegistered && (
        <div className="mb-4 rounded-lg bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
          ¡Cuenta creada! Ya puedes iniciar sesión.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@negocio.cl"
            {...register('email')}
            className={inputClass}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <Link href="/forgot-password" className="text-xs text-blue-500 hover:text-blue-600">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className={inputClass}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

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
              Ingresando…
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-blue-500 hover:text-blue-600">
          Regístrate
        </Link>
      </p>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#F9FAFB] sm:items-center sm:px-4">
      <div className="w-full bg-white px-6 py-10 sm:max-w-md sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:p-8 sm:shadow-sm">
        {/* Logo */}
        <div className="mb-7 flex flex-col items-center gap-2 sm:mb-8">
          <div className="flex items-center gap-2">
            <Boxes className="size-6 text-blue-500 sm:size-7" />
            <span className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Nexo</span>
          </div>
          <p className="text-sm text-gray-500">Gestión inteligente para tu negocio</p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

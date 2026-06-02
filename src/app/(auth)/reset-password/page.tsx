'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@supabase/ssr'
import { Boxes, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const schema = z
  .object({
    password:        z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-10'

// ─── Inner component — uses useSearchParams ───────────────────────────────────

function ResetForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [status, setStatus]       = useState<'loading' | 'ready' | 'error' | 'done'>('loading')
  const [initError, setInitError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPwd, setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [, startTransition] = useTransition()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const code = searchParams.get('code')

    if (code) {
      // PKCE flow — exchange code for session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setInitError('El enlace es inválido o ya expiró. Solicita uno nuevo.')
          setStatus('error')
        } else {
          setStatus('ready')
        }
      })
    } else {
      // Hash-based / implicit flow — listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setStatus('ready')
      })
      // Give it 3 s; if nothing fires assume bad/missing link
      const timer = setTimeout(() => {
        setStatus(prev => prev === 'loading' ? 'error' : prev)
        setInitError('El enlace es inválido o ya expiró. Solicita uno nuevo.')
      }, 3000)
      return () => {
        subscription.unsubscribe()
        clearTimeout(timer)
      }
    }
  }, [])

  const onSubmit = ({ password }: FormData) => {
    setServerError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setServerError(error.message)
        return
      }
      await supabase.auth.signOut()
      setStatus('done')
      setTimeout(() => router.push('/login'), 2000)
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="size-6 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Verificando enlace…</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl">🔗</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Enlace inválido</h1>
          <p className="mt-1.5 text-sm text-gray-500">{initError}</p>
        </div>
        <Link
          href="/forgot-password"
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="size-7 text-green-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Contraseña actualizada</h1>
          <p className="mt-1.5 text-sm text-gray-500">Redirigiendo al inicio de sesión…</p>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-gray-900 sm:text-xl">
        Nueva contraseña
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Elige una contraseña segura de al menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Nueva contraseña */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              {...register('confirmPassword')}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {isSubmitting ? (
            <><Loader2 className="size-4 animate-spin" />Guardando…</>
          ) : (
            'Guardar nueva contraseña'
          )}
        </button>
      </form>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
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

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-blue-400" />
          </div>
        }>
          <ResetForm />
        </Suspense>

      </div>
    </div>
  )
}

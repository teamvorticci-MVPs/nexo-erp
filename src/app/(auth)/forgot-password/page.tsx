'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@supabase/ssr'
import { Boxes, Loader2, ArrowLeft, MailCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = ({ email }: FormData) => {
    setServerError(null)
    startTransition(async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      })
      if (error) {
        setServerError('No se pudo enviar el correo. Inténtalo de nuevo.')
        return
      }
      setSentEmail(email)
      setSent(true)
    })
  }

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

        {sent ? (
          /* ── Success state ──────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-green-100">
              <MailCheck className="size-7 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Revisa tu correo</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Enviamos instrucciones a <strong className="text-gray-700">{sentEmail}</strong>.
                El enlace expira en 1 hora.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              ¿No llegó?{' '}
              <button
                onClick={() => setSent(false)}
                className="font-medium text-blue-500 hover:text-blue-600"
              >
                Reenviar
              </button>
            </p>
            <Link
              href="/login"
              className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          /* ── Form ───────────────────────────────────────────────────── */
          <>
            <h1 className="mb-1 text-lg font-semibold text-gray-900 sm:text-xl">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>

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
                  className={inputCls}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" />Enviando…</>
                ) : (
                  'Enviar instrucciones'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 font-medium text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="size-3.5" />
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refresca la sesión en cada request y devuelve el usuario actual.
 * Debe llamarse desde src/middleware.ts para que las cookies de sesión
 * se mantengan actualizadas en el navegador.
 */
export async function updateSession(request: NextRequest) {
  // Empezamos con una respuesta pass-through; se reemplaza si se setean cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Propagar cookies al request (necesario para el cliente de Supabase)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Reconstruir la respuesta con las nuevas cookies
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: getUser() valida el token con Supabase Auth Server.
  // No usar getSession() aquí — no es seguro en el servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}

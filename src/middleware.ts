import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas del grupo (dashboard) — cualquier pathname que empiece por estos segmentos
const DASHBOARD_PATHS = [
  '/dashboard',
  '/productos',
  '/inventario',
  '/ventas',
  '/caja',
  '/reportes',
  '/alertas',
  '/configuracion',
]

// Rutas de autenticación — redirigir al dashboard si ya hay sesión
const AUTH_PATHS = ['/login', '/register']

function isDashboardPath(pathname: string) {
  return DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Sin sesión → redirigir al login si intenta entrar al dashboard
  if (!user && isDashboardPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Con sesión → redirigir al dashboard si visita login/register
  if (user && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Pasar la respuesta con cookies de sesión actualizadas
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Excluir rutas de Next.js internas y archivos estáticos.
     * Incluir todo lo demás para que las cookies de sesión se actualicen.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// Rutas del grupo (dashboard)
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

function isSuperadminPath(pathname: string) {
  return pathname === '/superadmin' || pathname.startsWith('/superadmin/')
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Sin sesión → redirigir al login si intenta entrar al dashboard o superadmin
  if (!user && (isDashboardPath(pathname) || isSuperadminPath(pathname))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Con sesión → redirigir al dashboard si visita login/register
  if (user && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Proteger /superadmin/* — solo usuarios en tabla superadmins
  if (user && isSuperadminPath(pathname)) {
    const { data: superadmin } = await supabase
      .from('superadmins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!superadmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Superadmin que va a /dashboard → redirigir a /superadmin/dashboard
  if (user && pathname === '/dashboard') {
    const { data: superadmin } = await supabase
      .from('superadmins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (superadmin) {
      return NextResponse.redirect(new URL('/superadmin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

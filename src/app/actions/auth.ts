'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSBClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/types/database'

// ─── Clientes ─────────────────────────────────────────────────────────────────
//
// getAdminClient()  — @supabase/supabase-js sin genérico Database.
//   Service role key: bypasea RLS y tiene auth.admin.*.
//   Los tipos de DB se afirman explícitamente donde se usan.
//   NUNCA se expone al cliente ni al bundle del navegador.
//
// createClient()    — @supabase/ssr con cookies.
//   Para signInWithPassword: establece la sesión en el navegador.

function getAdminClient() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ActionError = { error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// ─── signIn ───────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function signIn(
  email: string,
  password: string,
): Promise<ActionError | void> {
  const parsed = signInSchema.safeParse({ email, password })
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: 'Correo o contraseña incorrectos.' }

  redirect('/dashboard')
}

// ─── signUp ───────────────────────────────────────────────────────────────────
// Flujo atómico manual (Postgres no tiene TX cross-servicio):
//  1. Crear usuario en Supabase Auth  (email_confirm: true, sin envío de email)
//  2. Crear tenant en tabla `tenants`
//  3. Crear perfil en tabla `users`   (role = admin)
//  Rollback: si falla paso 2 o 3 se elimina lo ya creado.
//  4. signInWithPassword con el cliente con cookies → sesión en el navegador.

const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  fullName: z.string().min(2, 'Ingresa tu nombre completo').max(80),
  tenantName: z.string().min(2, 'Ingresa el nombre de tu tienda').max(100),
})

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  tenantName: string,
): Promise<ActionError | void> {
  const parsed = signUpSchema.safeParse({ email, password, fullName, tenantName })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const { email: e, password: p, fullName: fn, tenantName: tn } = parsed.data

  // ── Diagnóstico de variables de entorno ───────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  console.log('[signUp] ENV CHECK', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `${supabaseUrl.slice(0, 30)}…` : '❌ NO DEFINIDA',
    SUPABASE_SECRET_KEY: secretKey
      ? `✅ definida (${secretKey.length} chars, empieza con "${secretKey.slice(0, 6)}")`
      : '❌ NO DEFINIDA',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey
      ? `✅ definida (${publishableKey.length} chars)`
      : '❌ NO DEFINIDA',
  })

  if (!secretKey) {
    console.error('[signUp] SUPABASE_SECRET_KEY no está definida en .env.local')
    return { error: 'Configuración incompleta del servidor. Falta SUPABASE_SECRET_KEY.' }
  }

  const admin = getAdminClient()

  // ── 1. Crear usuario en Supabase Auth ─────────────────────────────────────
  console.log('[signUp] Paso 1: creando auth user para', e)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: e,
    password: p,
    email_confirm: true,
    user_metadata: { full_name: fn },
  })

  if (authError) {
    console.error('[signUp] Paso 1 FALLÓ:', {
      message: authError.message,
      status: authError.status,
      code: (authError as { code?: string }).code,
      name: authError.name,
    })
    const msg = authError.message.toLowerCase()
    const isDuplicate =
      msg.includes('already registered') ||
      msg.includes('user already exists') ||
      msg.includes('already been registered')
    return {
      error: isDuplicate
        ? 'Este correo ya está registrado. Intenta iniciar sesión.'
        : `Error al crear la cuenta: ${authError.message}`,
    }
  }

  const authUserId = authData.user.id
  console.log('[signUp] Paso 1 OK. auth user id:', authUserId)

  // ── 2. Crear tenant ───────────────────────────────────────────────────────
  const slug = `${slugify(tn)}-${authUserId.slice(0, 6)}`
  console.log('[signUp] Paso 2: insertando tenant', { name: tn, slug, email: e })

  const { data: tenantData, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: tn, slug, email: e })
    .select()
    .single()

  const tenant = tenantData as Tenant | null

  if (tenantError || !tenant) {
    console.error('[signUp] Paso 2 FALLÓ:', {
      message: tenantError?.message,
      details: tenantError?.details,
      hint: tenantError?.hint,
      code: tenantError?.code,
      tenantData,
    })
    await admin.auth.admin.deleteUser(authUserId)
    console.log('[signUp] Rollback: auth user eliminado')
    return {
      error: `Error al crear la tienda: ${tenantError?.message ?? 'sin datos devueltos'}`,
    }
  }

  console.log('[signUp] Paso 2 OK. tenant id:', tenant.id)

  // ── 3. Crear perfil de usuario ────────────────────────────────────────────
  console.log('[signUp] Paso 3: insertando user profile', { id: authUserId, tenant_id: tenant.id })

  const { error: profileError } = await admin.from('users').insert({
    id: authUserId,
    tenant_id: tenant.id,
    email: e,
    full_name: fn,
    role: 'admin',
  })

  if (profileError) {
    console.error('[signUp] Paso 3 FALLÓ:', {
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
    })
    await admin.from('tenants').delete().eq('id', tenant.id)
    await admin.auth.admin.deleteUser(authUserId)
    console.log('[signUp] Rollback: tenant y auth user eliminados')
    return { error: `Error al crear el perfil: ${profileError.message}` }
  }

  console.log('[signUp] Paso 3 OK.')

  // ── 4. Iniciar sesión (establece cookies de sesión en el navegador) ───────
  console.log('[signUp] Paso 4: signInWithPassword')
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: e,
    password: p,
  })

  if (signInError) {
    console.error('[signUp] Paso 4 FALLÓ (cuenta creada OK):', signInError.message)
    redirect('/login?registered=true')
  }

  console.log('[signUp] Paso 4 OK. Redirigiendo a /dashboard')
  redirect('/dashboard')
}

// ─── signOut ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

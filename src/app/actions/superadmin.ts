'use server'

import { z } from 'zod'
import { createClient as createSBClientLib } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, User } from '@/types/database'

// ─── Admin client (service role, bypasses RLS) ────────────────────────────────
// ONLY used in Server Actions — never exposed to the browser bundle.

function getAdminClient() {
  return createSBClientLib(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function assertSuperadmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { data } = await supabase
    .from('superadmins')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!data) throw new Error('Acceso denegado')
}

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type TenantWithStats = Tenant & {
  user_count: number
  product_count: number
  total_sales: number
  admin_email: string | null
}

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string }

// ─── getTenants ───────────────────────────────────────────────────────────────

export async function getTenants(): Promise<ActionResult<TenantWithStats[]>> {
  try {
    await assertSuperadmin()
    const admin = getAdminClient()

    const { data: tenants, error } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const tenantsWithStats = await Promise.all(
      (tenants as Tenant[]).map(async (tenant) => {
        const [usersRes, productsRes, salesRes, adminRes] = await Promise.all([
          admin.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          admin.from('sales').select('total').eq('tenant_id', tenant.id).eq('status', 'completada'),
          admin.from('users').select('email').eq('tenant_id', tenant.id).eq('role', 'admin').limit(1).single(),
        ])

        const total_sales = ((salesRes.data as { total: number }[] | null) ?? []).reduce(
          (sum, s) => sum + (s.total ?? 0),
          0,
        )

        return {
          ...tenant,
          user_count: usersRes.count ?? 0,
          product_count: productsRes.count ?? 0,
          total_sales,
          admin_email: (adminRes.data as { email: string } | null)?.email ?? null,
        }
      }),
    )

    return { data: tenantsWithStats }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── getTenant ────────────────────────────────────────────────────────────────

export async function getTenant(
  tenantId: string,
): Promise<ActionResult<{ tenant: Tenant; users: User[]; product_count: number; total_sales: number }>> {
  try {
    await assertSuperadmin()
    const admin = getAdminClient()

    const [tenantRes, usersRes, productsRes, salesRes] = await Promise.all([
      admin.from('tenants').select('*').eq('id', tenantId).single(),
      admin.from('users').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      admin.from('sales').select('total').eq('tenant_id', tenantId).eq('status', 'completada'),
    ])

    if (tenantRes.error) return { error: tenantRes.error.message }

    const total_sales = ((salesRes.data as { total: number }[] | null) ?? []).reduce(
      (sum, s) => sum + (s.total ?? 0),
      0,
    )

    return {
      data: {
        tenant: tenantRes.data as Tenant,
        users: (usersRes.data ?? []) as User[],
        product_count: productsRes.count ?? 0,
        total_sales,
      },
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── toggleTenantStatus ───────────────────────────────────────────────────────

export async function toggleTenantStatus(
  tenantId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await assertSuperadmin()
    const admin = getAdminClient()
    const { error } = await admin.from('tenants').update({ active }).eq('id', tenantId)
    if (error) return { error: error.message }
    return { data: undefined }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── updateTenantInfo ─────────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export async function updateTenantInfo(
  tenantId: string,
  data: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  try {
    await assertSuperadmin()
    const parsed = updateSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    const admin = getAdminClient()
    const { error } = await admin.from('tenants').update(parsed.data).eq('id', tenantId)
    if (error) return { error: error.message }
    return { data: undefined }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── createTenantWithAdmin ────────────────────────────────────────────────────

const createTenantSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tipoNegocio: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFullName: z.string().min(2).max(80),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>

export async function createTenantWithAdmin(
  input: CreateTenantInput,
): Promise<ActionResult<{ tenantId: string }>> {
  try {
    await assertSuperadmin()

    const parsed = createTenantSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

    const {
      tenantName, tipoNegocio, adminEmail, adminPassword, adminFullName,
      phone, address, city, country, currency,
    } = parsed.data

    const admin = getAdminClient()

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminFullName },
    })

    if (authError) {
      const msg = authError.message.toLowerCase()
      return {
        error: msg.includes('already') || msg.includes('exists')
          ? 'Este correo ya está registrado.'
          : `Error al crear usuario: ${authError.message}`,
      }
    }

    const authUserId = authData.user.id

    // 2. Crear tenant
    const slug = `${slugify(tenantName)}-${authUserId.slice(0, 6)}`
    const settings: Record<string, string> = {}
    if (tipoNegocio) settings.tipo_negocio = tipoNegocio
    if (city) settings.ciudad = city
    if (country) settings.pais = country
    if (currency) settings.moneda = currency

    const { data: tenantData, error: tenantError } = await admin
      .from('tenants')
      .insert({
        name: tenantName,
        slug,
        email: adminEmail,
        phone: phone ?? null,
        address: address ?? null,
        settings,
        active: true,
      })
      .select()
      .single()

    if (tenantError || !tenantData) {
      await admin.auth.admin.deleteUser(authUserId)
      return { error: `Error al crear tenant: ${tenantError?.message ?? 'sin datos'}` }
    }

    const tenant = tenantData as Tenant

    // 3. Crear perfil de usuario
    const { error: profileError } = await admin.from('users').insert({
      id: authUserId,
      tenant_id: tenant.id,
      email: adminEmail,
      full_name: adminFullName,
      role: 'admin',
    })

    if (profileError) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      await admin.auth.admin.deleteUser(authUserId)
      return { error: `Error al crear perfil: ${profileError.message}` }
    }

    return { data: { tenantId: tenant.id } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── bulkImportProducts ───────────────────────────────────────────────────────

export type ProductImportRow = {
  nombre: string
  categoria?: string
  precio_compra: number
  precio_venta: number
  stock: number
  stock_minimo: number
  sku?: string
  descripcion?: string
  unidad?: string
}

export async function bulkImportProducts(
  tenantId: string,
  products: ProductImportRow[],
): Promise<ActionResult<{ imported: number; errors: string[] }>> {
  try {
    await assertSuperadmin()

    if (!tenantId) return { error: 'tenantId requerido' }
    if (!products.length) return { error: 'Sin productos para importar' }

    const admin = getAdminClient()
    const errors: string[] = []
    const rows = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.nombre?.trim()) {
        errors.push(`Fila ${i + 2}: nombre requerido`)
        continue
      }
      if (isNaN(p.precio_venta) || p.precio_venta < 0) {
        errors.push(`Fila ${i + 2}: precio_venta inválido`)
        continue
      }
      rows.push({
        tenant_id: tenantId,
        name: p.nombre.trim(),
        category: p.categoria?.trim() ?? null,
        cost_price: Number(p.precio_compra) || 0,
        sale_price: Number(p.precio_venta),
        stock_quantity: Number(p.stock) || 0,
        stock_min: Number(p.stock_minimo) || 0,
        sku: p.sku?.trim() ?? null,
        description: p.descripcion?.trim() ?? null,
        unit: p.unidad?.trim() ?? 'unidad',
        active: true,
      })
    }

    if (!rows.length) return { error: 'Ninguna fila válida para importar' }

    // Insertar en lotes de 100
    let imported = 0
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100)
      const { error } = await admin.from('products').insert(batch)
      if (error) {
        errors.push(`Error en lote ${Math.floor(i / 100) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return { data: { imported, errors } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

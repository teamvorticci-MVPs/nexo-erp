'use server'

import { z } from 'zod'
import { createClient as createSBClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Tenant, User } from '@/types/database'

// ─── Admin client — service role, bypasses RLS ────────────────────────────────
// NEVER exposed to browser bundle. Only used inside Server Actions.

function getAdmin() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Guard: caller must be a superadmin ───────────────────────────────────────

async function assertSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const allowed = process.env.SUPERADMIN_EMAIL
  if (!allowed || user.email?.toLowerCase() !== allowed.toLowerCase()) {
    throw new Error('Acceso denegado')
  }
}

// ─── Shared result type ───────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

// ─── getTenants ───────────────────────────────────────────────────────────────

export type TenantRow = Tenant & {
  product_count: number
  user_count: number
  total_sales: number
  admin_email: string | null
}

export async function getTenants(): Promise<ActionResult<TenantRow[]>> {
  try {
    await assertSuperadmin()
    const admin = getAdmin()

    const { data: tenants, error } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    const rows = await Promise.all(
      (tenants as Tenant[]).map(async (t) => {
        const [pr, ur, sr, ar] = await Promise.all([
          admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
          admin.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
          admin.from('sales').select('total').eq('tenant_id', t.id).eq('status', 'completada'),
          admin.from('users').select('email').eq('tenant_id', t.id).eq('role', 'admin').limit(1).single(),
        ])
        const total_sales = ((sr.data ?? []) as { total: number }[]).reduce((s, x) => s + (x.total ?? 0), 0)
        return {
          ...t,
          product_count: pr.count ?? 0,
          user_count: ur.count ?? 0,
          total_sales,
          admin_email: (ar.data as { email: string } | null)?.email ?? null,
        }
      }),
    )

    return { data: rows }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── getTenant ────────────────────────────────────────────────────────────────

export type TenantDetail = {
  tenant: Tenant
  users: User[]
  product_count: number
  total_sales: number
}

export async function getTenant(id: string): Promise<ActionResult<TenantDetail>> {
  try {
    await assertSuperadmin()
    const admin = getAdmin()

    const [tr, ur, pr, sr] = await Promise.all([
      admin.from('tenants').select('*').eq('id', id).single(),
      admin.from('users').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
      admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      admin.from('sales').select('total').eq('tenant_id', id).eq('status', 'completada'),
    ])

    if (tr.error) return { error: tr.error.message }

    const total_sales = ((sr.data ?? []) as { total: number }[]).reduce(
      (sum, s) => sum + (s.total ?? 0), 0,
    )

    return {
      data: {
        tenant: tr.data as Tenant,
        users: (ur.data ?? []) as User[],
        product_count: pr.count ?? 0,
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
    const { error } = await getAdmin().from('tenants').update({ active }).eq('id', tenantId)
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
  phone: z.string().nullish(),
  address: z.string().nullish(),
})

export async function updateTenantInfo(
  tenantId: string,
  data: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  try {
    await assertSuperadmin()
    const parsed = updateSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    const { error } = await getAdmin().from('tenants').update(parsed.data).eq('id', tenantId)
    if (error) return { error: error.message }
    return { data: undefined }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── createTenantWithAdmin ────────────────────────────────────────────────────

const createSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tipoNegocio: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFullName: z.string().min(2).max(80),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  country: z.string().nullish(),
  currency: z.string().nullish(),
})

export type CreateTenantInput = z.infer<typeof createSchema>

export async function createTenantWithAdmin(
  input: CreateTenantInput,
): Promise<ActionResult<{ tenantId: string }>> {
  try {
    await assertSuperadmin()
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

    const { tenantName, tipoNegocio, adminEmail, adminPassword, adminFullName,
            phone, address, city, country, currency } = parsed.data
    const admin = getAdmin()

    // 1. Auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminFullName },
    })
    if (authErr) {
      const dup = authErr.message.toLowerCase()
      return {
        error: dup.includes('already') || dup.includes('exists')
          ? 'Este correo ya está registrado.'
          : `Error al crear usuario: ${authErr.message}`,
      }
    }
    const uid = authData.user.id

    // 2. Tenant
    const settings: Record<string, string> = {}
    if (tipoNegocio) settings.tipo_negocio = tipoNegocio
    if (city) settings.ciudad = city
    if (country) settings.pais = country
    if (currency) settings.moneda = currency

    const { data: tenantData, error: tenantErr } = await admin
      .from('tenants')
      .insert({ name: tenantName, slug: `${slugify(tenantName)}-${uid.slice(0, 6)}`,
                email: adminEmail, phone: phone ?? null, address: address ?? null,
                settings, active: true })
      .select()
      .single()

    if (tenantErr || !tenantData) {
      await admin.auth.admin.deleteUser(uid)
      return { error: `Error al crear negocio: ${tenantErr?.message ?? 'sin datos'}` }
    }

    const tenant = tenantData as Tenant

    // 3. User profile
    const { error: profErr } = await admin.from('users').insert({
      id: uid, tenant_id: tenant.id, email: adminEmail,
      full_name: adminFullName, role: 'admin',
    })
    if (profErr) {
      await admin.from('tenants').delete().eq('id', tenant.id)
      await admin.auth.admin.deleteUser(uid)
      return { error: `Error al crear perfil: ${profErr.message}` }
    }

    return { data: { tenantId: tenant.id } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── getTenantProducts ────────────────────────────────────────────────────────

export type ProductRow = {
  id: string
  name: string
  category: string | null
  sku: string | null
  sale_price: number
  stock_quantity: number
  active: boolean
}

export async function getTenantProducts(
  tenantId: string,
): Promise<ActionResult<ProductRow[]>> {
  try {
    await assertSuperadmin()
    const { data, error } = await getAdmin()
      .from('products')
      .select('id, name, category, sku, sale_price, stock_quantity, active')
      .eq('tenant_id', tenantId)
      .order('name')
    if (error) return { error: error.message }
    return { data: (data ?? []) as ProductRow[] }
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
    if (!products.length) return { error: 'Sin productos' }

    const admin = getAdmin()
    const errors: string[] = []
    const rows: object[] = []

    products.forEach((p, i) => {
      if (!p.nombre?.trim()) { errors.push(`Fila ${i + 2}: nombre requerido`); return }
      if (isNaN(p.precio_venta) || p.precio_venta < 0) { errors.push(`Fila ${i + 2}: precio_venta inválido`); return }
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
        unit: p.unidad?.trim() || 'unidad',
        active: true,
      })
    })

    if (!rows.length) return { error: 'Sin filas válidas' }

    let imported = 0
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await admin.from('products').insert(rows.slice(i, i + 100))
      if (error) errors.push(`Lote ${Math.floor(i / 100) + 1}: ${error.message}`)
      else imported += Math.min(100, rows.length - i)
    }

    return { data: { imported, errors } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

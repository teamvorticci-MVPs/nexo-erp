'use server'

import { z } from 'zod'
import { createClient as createSBClient } from '@supabase/supabase-js'

const schema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(2, 'Ingresa el nombre completo').max(80),
  role: z.enum(['admin', 'vendedor']),
  tenantId: z.string().uuid(),
})

function getAdminClient() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: 'admin' | 'vendedor',
  tenantId: string,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email, fullName, role, tenantId })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const admin = getAdminClient()

  // Temporary random password — user should reset via email
  const tempPassword =
    Math.random().toString(36).slice(-8) +
    Math.random().toString(36).toUpperCase().slice(-4) +
    '1!'

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return { error: 'Este correo ya tiene una cuenta registrada.' }
    }
    return { error: authError.message }
  }

  const { error: profileError } = await admin.from('users').insert({
    id: authData.user.id,
    tenant_id: parsed.data.tenantId,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  return {}
}

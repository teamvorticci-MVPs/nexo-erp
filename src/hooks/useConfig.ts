import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { User } from '@/types/database'

export type TenantFormData = {
  name: string
  phone: string
  address: string
  city: string
  cuit: string
  tipo_negocio: string
  sitio_web: string
  pais: string
  moneda: string
  email_contacto: string
}

function getRawClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export function useConfig() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { tenant, setTenant } = useAuthStore()

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createClient() as any)
      .from('users')
      .select('*')
      .eq('active', true)
      .order('full_name')
    setUsers((data ?? []) as User[])
    setIsLoadingUsers(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const uploadLogo = useCallback(
    async (file: File): Promise<{ url: string | null; error?: string }> => {
      if (!tenant) return { url: null, error: 'Sin tenant activo' }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${tenant.id}/${Date.now()}.${ext}`
      const raw = getRawClient()

      const { error: uploadError } = await raw.storage
        .from('logos')
        .upload(path, file, { upsert: true })

      if (uploadError) return { url: null, error: uploadError.message }

      const { data: urlData } = raw.storage.from('logos').getPublicUrl(path)
      const url = urlData.publicUrl

      const { error: dbError } = await raw
        .from('tenants')
        .update({ logo_url: url })
        .eq('id', tenant.id)

      if (dbError) return { url: null, error: dbError.message }

      setTenant({ ...tenant, logo_url: url })
      return { url }
    },
    [tenant, setTenant],
  )

  const updateTenant = useCallback(
    async (data: TenantFormData): Promise<{ error?: string }> => {
      if (!tenant) return { error: 'Sin tenant activo' }
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      const prevSettings = (tenant.settings as Record<string, unknown>) ?? {}
      const settings = {
        ...prevSettings,
        city: data.city.trim() || null,
        cuit: data.cuit.trim() || null,
        tipo_negocio: data.tipo_negocio || null,
        sitio_web: data.sitio_web.trim() || null,
        pais: data.pais || null,
        moneda: data.moneda || null,
        email_contacto: data.email_contacto.trim() || null,
      }

      const { error: err } = await getRawClient()
        .from('tenants')
        .update({
          name: data.name,
          phone: data.phone.trim() || null,
          address: data.address.trim() || null,
          settings,
        })
        .eq('id', tenant.id)

      setIsSaving(false)

      if (err) {
        setSaveError(err.message)
        return { error: err.message }
      }

      setTenant({
        ...tenant,
        name: data.name,
        phone: data.phone.trim() || null,
        address: data.address.trim() || null,
        settings,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      return {}
    },
    [tenant, setTenant],
  )

  const deactivateUser = useCallback(
    async (userId: string): Promise<{ error?: string }> => {
      const { error: err } = await getRawClient()
        .from('users')
        .update({ active: false })
        .eq('id', userId)
      if (err) return { error: err.message }
      await fetchUsers()
      return {}
    },
    [fetchUsers],
  )

  const tenantSettings = (tenant?.settings as Record<string, string> | null) ?? {}

  const defaultFormValues: TenantFormData = {
    name: tenant?.name ?? '',
    phone: tenant?.phone ?? '',
    address: tenant?.address ?? '',
    city: tenantSettings.city ?? '',
    cuit: tenantSettings.cuit ?? '',
    tipo_negocio: tenantSettings.tipo_negocio ?? '',
    sitio_web: tenantSettings.sitio_web ?? '',
    pais: tenantSettings.pais ?? 'Chile',
    moneda: tenantSettings.moneda ?? 'CLP',
    email_contacto: tenantSettings.email_contacto ?? '',
  }

  return {
    tenant,
    defaultFormValues,
    users,
    isLoadingUsers,
    isSaving,
    saveError,
    saveSuccess,
    updateTenant,
    uploadLogo,
    deactivateUser,
    refetchUsers: fetchUsers,
  }
}

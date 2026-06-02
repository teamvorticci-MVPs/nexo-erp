import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Tenant } from '@/types/database'

interface AuthState {
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setTenant: (tenant: Tenant | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  tenant: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),

  initialize: async () => {
    const supabase = createClient()
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        set({ user: null, tenant: null, isLoading: false })
        return
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Explicit cast: supabase-js generics can lose inference after .single()
      const profile = profileData as User | null

      if (!profile) {
        set({ user: null, tenant: null, isLoading: false })
        return
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()

      const tenant = tenantData as Tenant | null

      set({ user: profile, tenant: tenant ?? null, isLoading: false })
    } catch {
      set({ user: null, tenant: null, isLoading: false })
    }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, tenant: null, isLoading: false })
  },
}))

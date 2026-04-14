'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return { signOut }
}

// Expone el usuario autenticado actual (id, email, etc.)
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['current-user'],
    staleTime: Infinity, // la sesión no cambia frecuentemente
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      return data.user ?? null
    },
  })
}

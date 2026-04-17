'use client'

import { type ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { useActiveHotel, useUXProfile } from '@/features/identity/hooks/use-active-hotel'

// Loading skeleton del shell
function ShellSkeleton() {
  return (
    <div className="flex h-screen bg-bg-primary">
      <div className="w-56 border-r border-border bg-bg-sidebar" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border" />
        <div className="flex-1 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-bg-card" />
        </div>
      </div>
    </div>
  )
}

// Error state
function ShellError({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="text-center space-y-2">
        <p className="text-danger">{message}</p>
        <a href="/login" className="text-sm text-accent hover:text-accent-hover">
          Volver al login
        </a>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: hotel, isLoading, error } = useActiveHotel()
  const profile = useUXProfile()
  const router = useRouter()

  // Redirect a onboarding solo si no hay membership (data null sin error)
  // Los errores transitorios (red, timeout) muestran ShellError — no redirigen
  useEffect(() => {
    if (!isLoading && !error && !hotel) {
      router.push('/onboarding')
    }
  }, [isLoading, error, hotel, router])

  if (isLoading) return <ShellSkeleton />
  if (error) return <ShellError message="Error al cargar el perfil. Comprueba tu conexión." />
  if (!hotel || !profile) return <ShellSkeleton />

  return (
    <div className="flex h-screen bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[color:var(--accent-fg)]"
      >
        Saltar al contenido
      </a>
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar hotel={hotel} />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

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

  // Redirect a onboarding si no hay membership
  useEffect(() => {
    if (!isLoading && (error || !hotel)) {
      router.push('/onboarding')
    }
  }, [isLoading, error, hotel, router])

  if (isLoading) return <ShellSkeleton />
  if (!hotel || !profile) return <ShellSkeleton />

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar hotel={hotel} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

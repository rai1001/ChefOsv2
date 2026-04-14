'use client'

import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { ROLE_TO_PROFILE } from '@/features/identity/types'

export default function DashboardPage() {
  const { data: hotel } = useActiveHotel()

  if (!hotel) return null

  const profile = ROLE_TO_PROFILE[hotel.role]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {profile === 'cocina' && 'Hoy'}
          {profile === 'oficina' && 'Dashboard'}
          {profile === 'compras' && 'Pedidos'}
          {profile === 'comercial' && 'Eventos'}
        </h1>
        <p className="text-sm text-text-secondary">
          {hotel.hotel_name} · {hotel.role}
        </p>
      </div>

      {/* Placeholder: aquí irán los widgets por perfil */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-bg-card p-6"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-bg-hover" />
          </div>
        ))}
      </div>

      {/* Empty state para módulos */}
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
        <p className="text-text-secondary">
          Módulo en construcción. Los datos aparecerán cuando se creen eventos y recetas.
        </p>
      </div>
    </div>
  )
}

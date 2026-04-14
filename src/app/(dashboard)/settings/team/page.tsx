'use client'

import { Users } from 'lucide-react'

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Equipo</h1>
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-text-muted" />
        <p className="mt-3 text-text-secondary">Gestion de equipo en desarrollo</p>
        <p className="mt-1 text-xs text-text-muted">Miembros, roles, invitaciones</p>
      </div>
    </div>
  )
}

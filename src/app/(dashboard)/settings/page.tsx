'use client'

import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-text-primary">Configuracion</h1>
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
        <Settings className="mx-auto h-12 w-12 text-text-muted" />
        <p className="mt-3 text-text-secondary">Configuracion del hotel en desarrollo</p>
        <p className="mt-1 text-xs text-text-muted">Roles, permisos, integraciones</p>
      </div>
    </div>
  )
}

'use client'

import { TrendingUp } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Reportes</h1>
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-text-muted" />
        <p className="mt-3 text-text-secondary">Modulo de reportes en desarrollo</p>
        <p className="mt-1 text-xs text-text-muted">Food cost, mermas, tendencias y mas</p>
      </div>
    </div>
  )
}

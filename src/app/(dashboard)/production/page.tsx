'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useProductionPlans, useProductionSummary, useGeneratePlan } from '@/features/production/hooks/use-production'
import {
  PLAN_STATUS_LABELS,
  PLAN_STATUS_VARIANT,
} from '@/features/production/types'
import { ClipboardList, Plus, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const { data: plans, isLoading } = useProductionPlans()
  const { data: summary } = useProductionSummary(selectedDate)
  const generatePlan = useGeneratePlan()

  function handleGenerate() {
    generatePlan.mutate(selectedDate, {
      onSuccess: (planId) => {
        window.location.href = `/production/${planId}`
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary" style={{ fontSize: '28px' }}>Producción</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {summary && !summary.has_plan && (
            <button
              onClick={handleGenerate}
              disabled={generatePlan.isPending}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {generatePlan.isPending ? 'Generando...' : 'Generar plan'}
            </button>
          )}
        </div>
      </div>

      {/* Today summary */}
      {summary && (
        <div className="rounded-lg border border-border bg-bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">
              {new Date(selectedDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            {summary.has_plan && (
              <Link
                href={`/production/${summary.plan_id}`}
                className="text-sm text-accent hover:text-accent-hover"
              >
                Ver plan completo
              </Link>
            )}
          </div>

          {summary.has_plan ? (
            <div className="space-y-4">
              {/* Progress */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="kpi-value">{summary.total_items}</p>
                  <p className="kpi-label mt-1">Total tareas</p>
                </div>
                <div className="status-rail warning rounded-r-md pl-3">
                  <p className="kpi-value">{summary.pending}</p>
                  <p className="kpi-label mt-1">Pendientes</p>
                </div>
                <div className="status-rail info rounded-r-md pl-3">
                  <p className="kpi-value">{summary.in_progress}</p>
                  <p className="kpi-label mt-1">En curso</p>
                </div>
                <div className="status-rail success rounded-r-md pl-3">
                  <p className="kpi-value">{summary.done}</p>
                  <p className="kpi-label mt-1">Completadas</p>
                </div>
              </div>

              {/* Progress bar */}
              {summary.total_items && summary.total_items > 0 && (
                <div className="h-2 rounded-full bg-bg-hover overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{ width: `${((summary.done ?? 0) / summary.total_items) * 100}%` }}
                  />
                </div>
              )}

              {/* By department */}
              {summary.by_department && summary.by_department.length > 0 && (
                <div className="grid gap-2 md:grid-cols-3">
                  {summary.by_department.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm text-text-secondary capitalize">
                        {dept.department.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {dept.done}/{dept.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Events */}
              {summary.events && summary.events.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Eventos del dia</p>
                  <div className="space-y-1">
                    {summary.events.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between text-sm">
                        <Link href={`/events/${ev.id}`} className="text-accent hover:text-accent-hover">
                          {ev.name}
                        </Link>
                        <span className="text-text-muted">{ev.guest_count} pax</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <ClipboardList className="mx-auto h-10 w-10 text-text-muted" />
              <p className="mt-2 text-text-secondary">No hay plan para este dia</p>
              {summary.events_count && summary.events_count > 0 ? (
                <p className="text-sm text-text-muted">
                  {summary.events_count} evento(s) confirmado(s) — genera el plan
                </p>
              ) : (
                <p className="text-sm text-text-muted">No hay eventos confirmados</p>
              )}
            </div>
          )}
        </div>
      )}

      {generatePlan.error && (
        <p className="text-sm text-danger">{(generatePlan.error as Error).message}</p>
      )}

      {/* Plans list */}
      <div className="rounded-lg border border-border bg-bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Planes recientes</h3>
        </div>
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
                <div className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        ) : !plans || plans.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-text-muted" />
            <p className="mt-2 text-text-secondary">No hay planes de produccion</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-text-muted" style={{ borderColor: 'var(--border-strong)', fontFamily: 'var(--font-code)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const variant = PLAN_STATUS_VARIANT[plan.status]
                return (
                  <tr key={plan.id} className={cn('status-rail border-b border-border last:border-0 hover:bg-bg-hover', variant)}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/production/${plan.id}`}
                        className="font-medium text-text-primary hover:text-accent font-data"
                      >
                        {new Date(plan.plan_date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge-status', variant)}>
                        {PLAN_STATUS_LABELS[plan.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted font-data">
                      {new Date(plan.created_at).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

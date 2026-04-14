'use client'

import { use } from 'react'
import Link from 'next/link'
import { useProductionPlan, useTransitionPlan, useTransitionPlanItem } from '@/features/production/hooks/use-production'
import {
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  DEPARTMENT_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '@/features/production/types'
import type { PlanStatus, PlanItemStatus, Department } from '@/features/production/types'
import { ArrowLeft, Play, CheckCircle2, ChefHat, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLAN_TRANSITIONS: Partial<Record<PlanStatus, { label: string; status: PlanStatus; variant: string }[]>> = {
  draft: [{ label: 'Activar plan', status: 'active', variant: 'bg-info text-white' }],
  active: [{ label: 'Iniciar produccion', status: 'in_progress', variant: 'bg-warning text-black' }],
  in_progress: [{ label: 'Completar', status: 'completed', variant: 'bg-success text-white' }],
}

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: plan, isLoading } = useProductionPlan(id)
  const transitionPlan = useTransitionPlan()
  const transitionItem = useTransitionPlanItem()

  function handleItemAction(itemId: string, newStatus: PlanItemStatus) {
    transitionItem.mutate({ itemId, newStatus })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-bg-card" />
        <div className="h-48 animate-pulse rounded-lg bg-bg-card" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Plan no encontrado</p>
        <Link href="/production" className="text-sm text-accent hover:text-accent-hover">
          Volver a produccion
        </Link>
      </div>
    )
  }

  // Group items by department
  const byDepartment = (plan.items ?? []).reduce((acc, item) => {
    if (!acc[item.department]) acc[item.department] = []
    acc[item.department].push(item)
    return acc
  }, {} as Record<Department, typeof plan.items>)

  const actions = PLAN_TRANSITIONS[plan.status] ?? []
  const totalItems = plan.items?.length ?? 0
  const doneItems = plan.items?.filter((i) => i.status === 'done').length ?? 0
  const progressPct = totalItems > 0 ? (doneItems / totalItems) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/production"
            className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Plan {new Date(plan.plan_date).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h1>
            <p className="text-sm text-text-muted">{totalItems} tareas</p>
          </div>
        </div>
        <span className={cn('rounded-md px-3 py-1 text-sm font-medium', PLAN_STATUS_COLORS[plan.status])}>
          {PLAN_STATUS_LABELS[plan.status]}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Progreso</span>
          <span className="text-sm font-medium text-text-primary">{doneItems}/{totalItems}</span>
        </div>
        <div className="h-3 rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Plan actions */}
      {actions.length > 0 && (
        <div className="flex items-center gap-3">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => transitionPlan.mutate({ planId: id, newStatus: action.status })}
              disabled={transitionPlan.isPending}
              className={cn('rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50', action.variant)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Items by department */}
      {Object.entries(byDepartment).length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-card p-12 text-center">
          <ChefHat className="mx-auto h-12 w-12 text-text-muted" />
          <p className="mt-3 text-text-secondary">Plan vacio</p>
          <p className="text-sm text-text-muted">No hay eventos con menus/recetas aprobadas para esta fecha</p>
        </div>
      ) : (
        Object.entries(byDepartment).map(([dept, items]) => (
          <div key={dept} className="rounded-lg border border-border bg-bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-text-primary uppercase tracking-wider">
                {DEPARTMENT_LABELS[dept as Department] ?? dept}
              </h3>
              <span className="text-xs text-text-muted">
                {items.filter((i) => i.status === 'done').length}/{items.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3',
                    item.status === 'done' && 'opacity-60'
                  )}
                >
                  {/* Status indicator */}
                  <div className={cn(
                    'h-3 w-3 rounded-full shrink-0',
                    item.status === 'pending' ? 'bg-text-muted' :
                    item.status === 'in_progress' ? 'bg-warning' :
                    item.status === 'done' ? 'bg-success' :
                    'bg-text-muted'
                  )} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium text-text-primary',
                      item.status === 'done' && 'line-through'
                    )}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {item.event && (
                        <span className="text-xs text-text-muted">{item.event.name}</span>
                      )}
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.servings_needed} raciones
                      </span>
                      <span className={cn('text-xs', PRIORITY_COLORS[item.priority])}>
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => handleItemAction(item.id, 'in_progress')}
                        disabled={transitionItem.isPending}
                        className="rounded p-1.5 text-info hover:bg-info/10 disabled:opacity-50"
                        title="Iniciar"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        onClick={() => handleItemAction(item.id, 'done')}
                        disabled={transitionItem.isPending}
                        className="rounded p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                        title="Completar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <span className={cn('text-xs ml-1', ITEM_STATUS_COLORS[item.status])}>
                      {ITEM_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {(transitionPlan.error || transitionItem.error) && (
        <p className="text-sm text-danger" role="alert">
          {((transitionPlan.error || transitionItem.error) as Error).message}
        </p>
      )}
    </div>
  )
}

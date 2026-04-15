'use client'

import { use } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  useWorkflowDetail,
  useStartWorkflowTask,
  useBlockWorkflowTask,
  useCompleteWorkflowTask,
} from '@/features/production/hooks/use-workflows'
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_BG,
  DEPARTMENT_LABELS,
  PRIORITY_COLORS,
  type WorkflowTask,
  type Department,
  type WorkflowDetail,
} from '@/features/production/types'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Lock,
  Clock,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// PDF — client-side only. Statically bundled in pdf-buttons to avoid
// react-pdf reconciler crash when document prop is a LoadableComponent.
const ProductionSheetBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.ProductionSheetBtn),
  { ssr: false, loading: () => null }
)

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: detail, isLoading } = useWorkflowDetail(id)
  const startTask = useStartWorkflowTask()
  const blockTask = useBlockWorkflowTask()
  const completeTask = useCompleteWorkflowTask()
  const { data: hotel } = useActiveHotel()
  const hotelName = hotel?.hotel_id ?? 'ChefOS v2'

  const [blockingTask, setBlockingTask] = useState<string | null>(null)
  const [blockReason, setBlockReason] = useState('')

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded bg-surface animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-md bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-6 text-center text-text-muted">
        Workflow no encontrado.{' '}
        <Link href="/production" className="text-accent underline">
          Volver
        </Link>
      </div>
    )
  }

  const pct = detail.tasks_total > 0
    ? Math.round((detail.tasks_done / detail.tasks_total) * 100)
    : 0

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/production" className="mt-1 text-text-muted hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-text-primary">{detail.name}</h1>
            <span className={cn('text-sm font-medium', WORKFLOW_STATUS_COLORS[detail.status])}>
              {WORKFLOW_STATUS_LABELS[detail.status]}
            </span>
          </div>
          {detail.event && (
            <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
              <CalendarDays className="h-4 w-4" />
              <span>{detail.event.name}</span>
              <span>·</span>
              <span>{new Date(detail.event.event_date).toLocaleDateString('es-ES')}</span>
              <span>·</span>
              <span>{detail.event.guest_count} pax</span>
            </div>
          )}
        </div>
        <ProductionSheetBtn detail={detail} hotelName={hotelName} />
      </div>

      {/* Progress */}
      <div className="rounded-md border border-border bg-surface p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {detail.tasks_done} / {detail.tasks_total} tareas completadas
          </span>
          <span className={cn('font-medium', pct === 100 ? 'text-success' : 'text-text-primary')}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-sidebar overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {detail.tasks_blocked > 0 && (
          <div className="flex items-center gap-1 text-xs text-danger">
            <Lock className="h-3 w-3" />
            {detail.tasks_blocked} tarea{detail.tasks_blocked > 1 ? 's' : ''} bloqueada{detail.tasks_blocked > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tasks por departamento */}
      <div className="space-y-4">
        {detail.by_department.map((dept) => (
          <DeptSection
            key={dept.department}
            department={dept.department}
            tasks={dept.tasks}
            onStart={(id) => startTask.mutate(id)}
            onComplete={(id) => completeTask.mutate({ task_id: id })}
            onBlockStart={(id) => {
              setBlockingTask(id)
              setBlockReason('')
            }}
            pendingIds={[
              ...(startTask.isPending ? [] : []),
              ...(completeTask.isPending ? [] : []),
            ]}
          />
        ))}
      </div>

      {/* Mise en place summary */}
      {detail.mise_en_place.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Mise en place</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {detail.mise_en_place.map((mep) => {
              const mpct = mep.total > 0 ? Math.round((mep.done / mep.total) * 100) : 0
              return (
                <Link
                  key={mep.list_id}
                  href="/production/mise-en-place"
                  className="rounded-lg border border-border bg-bg-sidebar p-3 hover:border-accent/40 transition-colors"
                >
                  <div className="text-xs font-medium text-text-primary truncate">
                    {DEPARTMENT_LABELS[mep.department]}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {mep.done}/{mep.total} ítems — {mpct}%
                  </div>
                  <div className="h-1 rounded-full bg-surface mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${mpct}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal bloqueo */}
      {blockingTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-md border border-border bg-bg-input p-5 w-full max-w-md space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Motivo del bloqueo</h2>
            <textarea
              autoFocus
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Describe qué impide continuar..."
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setBlockingTask(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                disabled={!blockReason.trim() || blockTask.isPending}
                onClick={async () => {
                  await blockTask.mutateAsync({ task_id: blockingTask, reason: blockReason })
                  setBlockingTask(null)
                }}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-60"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeptSection({
  department,
  tasks,
  onStart,
  onComplete,
  onBlockStart,
  pendingIds,
}: {
  department: Department
  tasks: WorkflowTask[]
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onBlockStart: (id: string) => void
  pendingIds: string[]
}) {
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-sidebar">
        <span className="text-sm font-semibold text-text-primary">
          {DEPARTMENT_LABELS[department]}
        </span>
        <span className="text-xs text-text-muted">
          {done}/{tasks.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onStart={() => onStart(task.id)}
            onComplete={() => onComplete(task.id)}
            onBlockStart={() => onBlockStart(task.id)}
            isPending={pendingIds.includes(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onStart,
  onComplete,
  onBlockStart,
  isPending,
}: {
  task: WorkflowTask
  onStart: () => void
  onComplete: () => void
  onBlockStart: () => void
  isPending: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', TASK_STATUS_BG[task.status])}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm',
            task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary font-medium'
          )}>
            {task.title}
          </span>
          <span className={cn('text-xs', TASK_STATUS_COLORS[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
          {task.priority !== 'normal' && (
            <span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </span>
          )}
        </div>
        {task.blocked_reason && (
          <div className="text-xs text-danger mt-0.5 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {task.blocked_reason}
          </div>
        )}
        {task.estimated_minutes && (
          <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimated_minutes} min
          </div>
        )}
      </div>

      {/* Acciones */}
      {task.status === 'todo' && (
        <button
          onClick={onStart}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-60"
        >
          <Play className="h-3 w-3" />
          Iniciar
        </button>
      )}
      {task.status === 'in_progress' && (
        <div className="flex gap-1">
          <button
            onClick={onBlockStart}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-danger/10 text-danger text-xs hover:bg-danger/20 transition-colors"
          >
            <Lock className="h-3 w-3" />
            Bloquear
          </button>
          <button
            onClick={onComplete}
            disabled={isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
          >
            <CheckCircle className="h-3 w-3" />
            Hecha
          </button>
        </div>
      )}
      {task.status === 'blocked' && (
        <button
          onClick={onStart}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/10 text-warning text-xs hover:bg-warning/20 transition-colors"
        >
          <Play className="h-3 w-3" />
          Reanudar
        </button>
      )}
      {task.status === 'done' && (
        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
      )}
    </div>
  )
}

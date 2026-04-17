'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWorkflows } from '@/features/production/hooks/use-workflows'
import { useWorkflowTasks, useStartWorkflowTask, useCompleteWorkflowTask } from '@/features/production/hooks/use-workflows'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_BG,
  DEPARTMENT_LABELS,
  PRIORITY_COLORS,
  type TaskStatus,
  type WorkflowTask,
} from '@/features/production/types'
import { Columns, Play, CheckCircle, Lock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

export default function KanbanPage() {
  const { data: workflows } = useWorkflows()
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')

  const activeWorkflows = workflows?.filter((w) => w.status === 'active' || w.status === 'draft') ?? []
  const { data: tasks } = useWorkflowTasks(selectedWorkflow || undefined)
  const startTask = useStartWorkflowTask()
  const completeTask = useCompleteWorkflowTask()

  const tasksByStatus = (status: TaskStatus) =>
    tasks?.filter((t) => t.status === status) ?? []

  return (
    <div className="p-6 space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Columns className="h-6 w-6 text-accent" />
          <h1 className="text-text-primary">Kanban de tareas</h1>
        </div>

        <select
          value={selectedWorkflow}
          onChange={(e) => setSelectedWorkflow(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Seleccionar workflow...</option>
          {activeWorkflows.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {!selectedWorkflow ? (
        <div className="text-center py-20 text-text-muted">
          <Columns className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un workflow activo para ver el kanban</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-[60vh]">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col)
            return (
              <div key={col} className="flex flex-col gap-2">
                {/* Column header */}
                <div className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md',
                  col === 'blocked' ? 'bg-danger/10' :
                  col === 'done' ? 'bg-success/10' :
                  col === 'in_progress' ? 'bg-warning/10' : 'bg-surface'
                )}>
                  <span className={cn('text-xs font-semibold uppercase tracking-wide', TASK_STATUS_COLORS[col])}>
                    {TASK_STATUS_LABELS[col]}
                  </span>
                  <span className="text-xs text-text-muted">{colTasks.length}</span>
                </div>

                {/* Tasks */}
                <div className="flex flex-col gap-2">
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onStart={() => startTask.mutate(task.id)}
                      onComplete={() => completeTask.mutate({ task_id: task.id })}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KanbanCard({
  task,
  onStart,
  onComplete,
}: {
  task: WorkflowTask
  onStart: () => void
  onComplete: () => void
}) {
  return (
    <div className={cn(
      'rounded-md border p-3 space-y-2',
      TASK_STATUS_BG[task.status],
      task.status === 'blocked' ? 'border-danger/30' :
      task.status === 'done' ? 'border-success/20' : 'border-border'
    )}>
      <div className="text-sm font-medium text-text-primary leading-snug">{task.title}</div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded">
          {DEPARTMENT_LABELS[task.department]}
        </span>
        {task.priority !== 'normal' && (
          <span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </span>
        )}
      </div>

      {task.blocked_reason && (
        <div className="text-xs text-danger flex items-center gap-1">
          <Lock className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{task.blocked_reason}</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-1 pt-1">
        {task.status === 'todo' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1 text-xs text-warning hover:text-warning/80 transition-colors"
          >
            <Play className="h-3 w-3" /> Iniciar
          </button>
        )}
        {(task.status === 'in_progress' || task.status === 'blocked') && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors"
          >
            <CheckCircle className="h-3 w-3" /> Completar
          </button>
        )}
      </div>
    </div>
  )
}

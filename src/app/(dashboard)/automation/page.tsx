'use client'

import { useState } from 'react'
import {
  useJobs,
  useJobLogs,
  useCancelJob,
} from '@/features/automation/hooks/use-automation'
import {
  JOB_TYPE_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUS_VARIANT,
  LOG_LEVEL_COLORS,
} from '@/features/automation/types'
import type { AutomationJob } from '@/features/automation/types'
import { RefreshCw, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// ─── Job logs row ─────────────────────────────────────────────────────────────
function JobLogsPanel({ job }: { job: AutomationJob }) {
  const { data: logs, isLoading } = useJobLogs(job.id, job.status === 'running')

  if (isLoading) {
    return <p className="text-xs text-text-muted p-2">Cargando logs…</p>
  }

  if (!logs || logs.length === 0) {
    return <p className="text-xs text-text-muted p-2">Sin logs para este job.</p>
  }

  return (
    <div className="space-y-0.5 p-2 font-mono text-xs">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2">
          <span className="text-text-muted shrink-0">
            {new Date(log.created_at).toLocaleTimeString('es-ES')}
          </span>
          <span
            className={cn(
              'uppercase font-medium w-14 shrink-0',
              LOG_LEVEL_COLORS[log.level]
            )}
          >
            [{log.level}]
          </span>
          <span className="text-text-secondary break-all">{log.message}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Job row ──────────────────────────────────────────────────────────────────
function JobRow({ job }: { job: AutomationJob }) {
  const [expanded, setExpanded] = useState(false)
  const cancel = useCancelJob()

  const variant = JOB_STATUS_VARIANT[job.status]
  return (
    <>
      <tr className={cn('status-rail border-b border-border/50 hover:bg-bg-hover/30 transition-colors', variant)}>
        <td className="py-2.5 px-3 text-sm text-text-primary">
          {JOB_TYPE_LABELS[job.job_type]}
        </td>
        <td className="py-2.5 px-3">
          <span className={cn('badge-status', variant)}>
            {JOB_STATUS_LABELS[job.status]}
          </span>
        </td>
        <td className="py-2.5 px-3 text-xs text-text-muted tabular-nums">
          {job.attempts}/{job.max_attempts}
        </td>
        <td className="py-2.5 px-3 text-xs text-text-muted tabular-nums">
          {relativeTime(job.created_at)}
        </td>
        <td className="py-2.5 px-3 text-xs text-text-muted tabular-nums">
          {job.completed_at
            ? relativeTime(job.completed_at)
            : job.started_at
            ? 'En curso'
            : '—'}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1">
            {/* Cancelar solo si está pendiente */}
            {job.status === 'pending' && (
              <button
                onClick={() => cancel.mutate(job.id)}
                disabled={cancel.isPending}
                title="Cancelar job"
                className="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Expandir logs */}
            <button
              onClick={() => setExpanded((v) => !v)}
              title="Ver logs"
              className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* Error inline */}
      {job.error && !expanded && (
        <tr className="border-b border-border/50">
          <td colSpan={6} className="px-3 pb-2 text-xs text-danger">
            Error: {job.error}
          </td>
        </tr>
      )}

      {/* Logs expandidos */}
      {expanded && (
        <tr className="border-b border-border/50">
          <td
            colSpan={6}
            className="bg-bg-sidebar/40 rounded-b"
          >
            <JobLogsPanel job={job} />
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const { data: jobs, isLoading, refetch, isFetching } = useJobs()

  const pending = jobs?.filter((j) => j.status === 'pending').length ?? 0
  const running = jobs?.filter((j) => j.status === 'running').length ?? 0
  const failed = jobs?.filter((j) => j.status === 'failed').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary">Automatización</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Cola de jobs asíncronos — los procesa el worker en segundo plano
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="status-rail warning rounded-r-md bg-bg-card p-3">
          <p className="kpi-value">{pending}</p>
          <p className="kpi-label mt-1">Pendientes</p>
        </div>
        <div className="status-rail info rounded-r-md bg-bg-card p-3">
          <p className="kpi-value">{running}</p>
          <p className="kpi-label mt-1">En ejecución</p>
        </div>
        <div className={cn('status-rail rounded-r-md bg-bg-card p-3', failed > 0 ? 'urgent' : '')}>
          <p className="kpi-value">{failed}</p>
          <p className="kpi-label mt-1">Fallidos</p>
        </div>
      </div>

      {/* Jobs table */}
      <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 skeleton" />
            ))}
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-text-secondary">Sin jobs en cola.</p>
            <p className="text-sm text-text-muted mt-1">
              Usa los botones en el detalle de un evento para encolar tareas.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-sidebar/30">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Intentos
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Fin
                </th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-text-muted text-center">
        La página se actualiza automáticamente cada 10 segundos.
      </p>
    </div>
  )
}

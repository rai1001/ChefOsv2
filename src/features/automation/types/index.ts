// M8 Automation — tipos frontend

export const JOB_TYPES = [
  'generate_workflow',
  'generate_shopping_list',
  'send_notification',
  'generate_snapshot',
  'reserve_stock',
  'calculate_cost',
  'export_pdf',
] as const
export type JobType = (typeof JOB_TYPES)[number]

export const JOB_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const LOG_LEVELS = ['info', 'warning', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  generate_workflow: 'Generar workflow',
  generate_shopping_list: 'Lista de compras',
  send_notification: 'Notificación',
  generate_snapshot: 'Snapshot KPI',
  reserve_stock: 'Reservar stock',
  calculate_cost: 'Calcular coste',
  export_pdf: 'Exportar PDF',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pendiente',
  running: 'En ejecución',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  running: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  cancelled: 'bg-bg-muted text-text-muted',
}

/** Left-border / badge-status variant (DESIGN.md §Left-Border Status System) */
export const JOB_STATUS_VARIANT: Record<JobStatus, 'warning' | 'info' | 'success' | 'urgent' | 'neutral'> = {
  pending: 'warning',
  running: 'info',
  completed: 'success',
  failed: 'urgent',
  cancelled: 'neutral',
}

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-text-secondary',
  warning: 'text-warning',
  error: 'text-danger',
}

export interface AutomationJob {
  id: string
  job_type: JobType
  status: JobStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  attempts: number
  max_attempts: number
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface JobLog {
  id: string
  level: LogLevel
  message: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface AutomationTrigger {
  id: string
  hotel_id: string
  trigger_event: string
  job_type: JobType
  payload_template: Record<string, unknown>
  delay_seconds: number
  is_active: boolean
  created_at: string
  updated_at: string
}

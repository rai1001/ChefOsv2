// M14 Notifications — tipos frontend

export const NOTIFICATION_TYPES = [
  'event_confirmed',
  'event_completed',
  'task_assigned',
  'stock_alert',
  'job_completed',
  'job_failed',
  'cost_alert',
  'system',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'critical'] as const
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  event_confirmed: 'Evento confirmado',
  event_completed: 'Evento completado',
  task_assigned: 'Tarea asignada',
  stock_alert: 'Alerta de stock',
  job_completed: 'Job completado',
  job_failed: 'Job fallido',
  cost_alert: 'Alerta de coste',
  system: 'Sistema',
}

export const NOTIFICATION_SEVERITY_COLORS: Record<NotificationSeverity, string> = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-danger',
}

export const NOTIFICATION_SEVERITY_DOT: Record<NotificationSeverity, string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-danger',
}

export interface Notification {
  id: string
  notification_type: NotificationType
  severity: NotificationSeverity
  title: string
  body: string | null
  action_url: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationPreference {
  notification_type: NotificationType
  in_app: boolean
  email: boolean
}

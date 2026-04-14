// M6 Production — Types

export const PLAN_STATUSES = ['draft', 'active', 'in_progress', 'completed'] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]

export const PLAN_ITEM_STATUSES = ['pending', 'in_progress', 'done', 'cancelled'] as const
export type PlanItemStatus = (typeof PLAN_ITEM_STATUSES)[number]

export const DEPARTMENTS = [
  'cocina_caliente',
  'cocina_fria',
  'pasteleria',
  'panaderia',
  'charcuteria',
  'pescaderia',
  'garde_manger',
  'servicio',
  'economato',
  'general',
] as const
export type Department = (typeof DEPARTMENTS)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

// === Interfaces ===

export interface ProductionPlan {
  id: string
  hotel_id: string
  plan_date: string
  status: PlanStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // aggregated
  items?: ProductionPlanItem[]
}

export interface ProductionPlanItem {
  id: string
  plan_id: string
  hotel_id: string
  recipe_id: string | null
  event_id: string | null
  title: string
  department: Department
  servings_needed: number
  priority: TaskPriority
  status: PlanItemStatus
  assigned_to: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  // joined
  recipe?: { id: string; name: string; category: string }
  event?: { id: string; name: string }
}

export interface ProductionSummary {
  has_plan: boolean
  plan_id?: string
  date: string
  status?: PlanStatus
  total_items?: number
  pending?: number
  in_progress?: number
  done?: number
  cancelled?: number
  events_count?: number
  by_department?: { department: Department; total: number; done: number }[]
  events?: { id: string; name: string; guest_count: number; start_time: string | null }[]
}

// === Labels ===

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  in_progress: 'En curso',
  completed: 'Completado',
}

export const PLAN_STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'text-text-muted',
  active: 'text-info',
  in_progress: 'text-warning',
  completed: 'text-success',
}

export const ITEM_STATUS_LABELS: Record<PlanItemStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
  cancelled: 'Cancelado',
}

export const ITEM_STATUS_COLORS: Record<PlanItemStatus, string> = {
  pending: 'text-text-muted',
  in_progress: 'text-warning',
  done: 'text-success',
  cancelled: 'text-text-muted',
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  cocina_caliente: 'Cocina caliente',
  cocina_fria: 'Cocina fria',
  pasteleria: 'Pasteleria',
  panaderia: 'Panaderia',
  charcuteria: 'Charcuteria',
  pescaderia: 'Pescaderia',
  garde_manger: 'Garde manger',
  servicio: 'Servicio',
  economato: 'Economato',
  general: 'General',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-text-muted',
  normal: 'text-text-secondary',
  high: 'text-warning',
  urgent: 'text-danger',
}

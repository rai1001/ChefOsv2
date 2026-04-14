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

// ============================================================
// M6 Avanzado — Workflows, KDS, Mise en Place, Shopping List
// ============================================================

export const WORKFLOW_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const KO_STATUSES = ['pending', 'acknowledged', 'in_progress', 'ready', 'delivered', 'cancelled'] as const
export type KOStatus = (typeof KO_STATUSES)[number]

export const KO_ITEM_STATUSES = ['pending', 'in_progress', 'ready', 'skipped'] as const
export type KOItemStatus = (typeof KO_ITEM_STATUSES)[number]

// === Interfaces ===

export interface Workflow {
  id: string
  hotel_id: string
  event_id: string | null
  plan_id: string | null
  name: string
  status: WorkflowStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // aggregated
  tasks_total?: number
  tasks_done?: number
  tasks_blocked?: number
}

export interface WorkflowTask {
  id: string
  workflow_id: string
  hotel_id: string
  title: string
  description: string | null
  department: Department
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  blocked_reason: string | null
  estimated_minutes: number | null
  actual_minutes: number | null
  depends_on_task_id: string | null
  started_at: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface WorkflowDetail {
  id: string
  name: string
  status: WorkflowStatus
  event: { id: string; name: string; event_date: string; guest_count: number } | null
  tasks_total: number
  tasks_done: number
  tasks_blocked: number
  by_department: {
    department: Department
    tasks: WorkflowTask[]
  }[]
  mise_en_place: {
    list_id: string
    department: Department
    title: string
    total: number
    done: number
  }[]
}

export interface MiseEnPlaceList {
  id: string
  workflow_id: string
  hotel_id: string
  department: Department
  title: string
  created_at: string
  // aggregated
  total?: number
  done?: number
}

export interface MiseEnPlaceItem {
  id: string
  list_id: string
  hotel_id: string
  recipe_id: string | null
  description: string
  quantity: number | null
  unit: string | null
  is_done: boolean
  done_by: string | null
  done_at: string | null
  sort_order: number
  created_at: string
}

export interface KitchenOrder {
  id: string
  hotel_id: string
  event_id: string | null
  station: Department
  status: KOStatus
  sequence_number: number
  notes: string | null
  fired_at: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joined
  items?: KitchenOrderItem[]
}

export interface KitchenOrderItem {
  id: string
  order_id: string
  hotel_id: string
  recipe_id: string | null
  title: string
  servings: number
  status: KOItemStatus
  notes: string | null
  fired_at: string | null
  ready_at: string | null
  sort_order: number
  created_at: string
}

export interface RecurringTaskTemplate {
  id: string
  hotel_id: string
  title: string
  description: string | null
  department: Department
  priority: TaskPriority
  byweekday: number[]
  estimated_minutes: number | null
  is_active: boolean
  created_at: string
}

export interface ShoppingListItem {
  product_id: string
  product_name: string
  qty_needed: number
  qty_available: number
  qty_to_order: number
  unit: string | null
  unit_price: number | null
}

export interface ShoppingListGroup {
  supplier_id: string | null
  supplier_name: string | null
  items: ShoppingListItem[]
}

// === Labels ===

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: 'text-text-muted',
  active: 'text-info',
  completed: 'text-success',
  cancelled: 'text-text-muted',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Pendiente',
  in_progress: 'En curso',
  blocked: 'Bloqueada',
  done: 'Hecha',
  cancelled: 'Cancelada',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-text-muted',
  in_progress: 'text-warning',
  blocked: 'text-danger',
  done: 'text-success',
  cancelled: 'text-text-muted',
}

export const TASK_STATUS_BG: Record<TaskStatus, string> = {
  todo: 'bg-surface',
  in_progress: 'bg-warning/10',
  blocked: 'bg-danger/10',
  done: 'bg-success/10',
  cancelled: 'bg-surface',
}

export const KO_STATUS_LABELS: Record<KOStatus, string> = {
  pending: 'Pendiente',
  acknowledged: 'Recibida',
  in_progress: 'En curso',
  ready: 'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

export const KO_STATUS_COLORS: Record<KOStatus, string> = {
  pending: 'text-text-muted',
  acknowledged: 'text-info',
  in_progress: 'text-warning',
  ready: 'text-success',
  delivered: 'text-text-muted',
  cancelled: 'text-text-muted',
}

export const KO_ITEM_STATUS_LABELS: Record<KOItemStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  ready: 'Lista',
  skipped: 'Omitida',
}

export const KO_ITEM_STATUS_COLORS: Record<KOItemStatus, string> = {
  pending: 'text-text-muted',
  in_progress: 'text-warning',
  ready: 'text-success',
  skipped: 'text-text-muted',
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

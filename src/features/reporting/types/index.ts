// M7 Reporting — Alerts + KPI Snapshots

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_TYPES = [
  'low_stock',
  'expiring_soon',
  'cost_overrun',
  'food_cost_high',
  'waste_high',
  'pending_approvals',
  'custom',
] as const
export type AlertType = (typeof ALERT_TYPES)[number]

export interface Alert {
  id: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string | null
  details: Record<string, unknown> | null
  related_entity_id: string | null
  related_entity_type: string | null
  created_at: string
}

export interface KpiSnapshot {
  id: string
  hotel_id: string
  snapshot_date: string
  events_completed: number
  events_total_pax: number
  total_theoretical_cost: number
  total_actual_cost: number
  avg_cost_per_pax: number | null
  inventory_value: number
  low_stock_products: number
  expiring_lots: number
  waste_records_7d: number
  pending_orders: number
  created_at: string
}

export interface FoodCostByEvent {
  event_id: string
  event_name: string
  event_date: string
  event_type: string
  service_type: string
  guest_count: number
  status: string
  theoretical_cost: number | null
  actual_cost: number | null
  variance_abs: number | null
  variance_pct: number | null
  cost_per_pax_theoretical: number | null
  cost_per_pax_actual: number | null
}

export interface FoodCostByService {
  service_type: string
  event_count: number
  total_pax: number
  total_theoretical_cost: number
  total_actual_cost: number
  avg_theoretical_per_event: number | null
  avg_cost_per_pax: number | null
  avg_variance_pct: number | null
}

export interface CostVarianceRow {
  event_id: string
  event_name: string
  event_date: string
  service_type: string
  guest_count: number
  theoretical_cost: number
  actual_cost: number
  variance_abs: number
  variance_pct: number
  cost_per_pax_delta: number | null
}

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-danger',
}

export const ALERT_SEVERITY_BG: Record<AlertSeverity, string> = {
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/30 bg-warning/5',
  critical: 'border-danger/30 bg-danger/5',
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  low_stock: 'Stock bajo',
  expiring_soon: 'Próxima caducidad',
  cost_overrun: 'Cost overrun',
  food_cost_high: 'Food cost alto',
  waste_high: 'Merma elevada',
  pending_approvals: 'Pendiente aprobación',
  custom: 'Alerta',
}

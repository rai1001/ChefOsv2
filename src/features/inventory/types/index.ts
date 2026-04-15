// M5 Inventory — Types

export const LOCATION_TYPES = ['dry', 'refrigerated', 'frozen', 'ambient'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const MOVEMENT_TYPES = [
  'reception',
  'consumption',
  'waste',
  'adjustment',
  'transfer',
  'return',
] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const WASTE_TYPES = [
  'expired',
  'damaged',
  'overproduction',
  'preparation',
  'other',
] as const
export type WasteType = (typeof WASTE_TYPES)[number]

export type AlertLevel = 'ok' | 'warning' | 'low' | 'critical'
export type AlertSeverity = 'info' | 'warning' | 'critical'

// === Interfaces ===

export interface StorageLocation {
  id: string
  hotel_id: string
  name: string
  location_type: LocationType
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface StockLot {
  id: string
  hotel_id: string
  product_id: string
  storage_location_id: string | null
  goods_receipt_line_id: string | null
  lot_number: string | null
  expiry_date: string | null
  initial_quantity: number
  current_quantity: number
  unit_cost: number | null
  received_at: string
  created_at: string
  // joined
  product?: { id: string; name: string }
  storage_location?: { id: string; name: string }
}

export interface StockMovement {
  id: string
  hotel_id: string
  product_id: string
  lot_id: string | null
  movement_type: MovementType
  quantity: number
  unit_cost: number | null
  reference_type: string | null
  reference_id: string | null
  from_location_id: string | null
  to_location_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  // joined
  product?: { id: string; name: string }
}

export interface WasteRecord {
  id: string
  hotel_id: string
  product_id: string
  lot_id: string | null
  quantity: number
  waste_type: WasteType
  department: string | null
  reason: string | null
  recorded_by: string
  created_at: string
  // joined
  product?: { id: string; name: string }
}

export interface StockLevel {
  product_id: string
  product_name: string
  category_name: string | null
  storage_type: string
  current_stock: number
  unit: string | null
  min_stock: number | null
  reorder_point: number | null
  avg_cost: number | null
  total_value: number
  earliest_expiry: string | null
  lot_count: number
  alert_level: AlertLevel
}

export interface StockAlert {
  type: 'low_stock' | 'expiry'
  severity: AlertSeverity
  product_id: string
  product_name: string
  current_stock?: number
  reorder_point?: number
  min_stock?: number
  lot_number?: string
  expiry_date?: string
  quantity?: number
}

// === Labels ===

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  dry: 'Seco',
  refrigerated: 'Refrigerado',
  frozen: 'Congelado',
  ambient: 'Ambiente',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  reception: 'Recepcion',
  consumption: 'Consumo',
  waste: 'Merma',
  adjustment: 'Ajuste',
  transfer: 'Transfer',
  return: 'Devolucion',
}

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  reception: 'text-success',
  consumption: 'text-info',
  waste: 'text-danger',
  adjustment: 'text-warning',
  transfer: 'text-accent',
  return: 'text-text-muted',
}

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  expired: 'Caducado',
  damaged: 'Danado',
  overproduction: 'Sobreproduccion',
  preparation: 'Preparacion',
  other: 'Otro',
}

export const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  ok: 'text-success',
  warning: 'text-warning',
  low: 'text-warning',
  critical: 'text-danger',
}

export const ALERT_LEVEL_BG: Record<AlertLevel, string> = {
  ok: 'bg-success/10',
  warning: 'bg-warning/10',
  low: 'bg-warning/10',
  critical: 'bg-danger/10',
}

// ============================================================
// M5 Avanzado — Reservas, Conteos, Forensics
// ============================================================

export const RESERVATION_STATUSES = ['pending', 'partial', 'consumed', 'released'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export const COUNT_STATUSES = ['open', 'in_progress', 'review', 'closed'] as const
export type CountStatus = (typeof COUNT_STATUSES)[number]

export const COUNT_TYPES = ['full', 'partial', 'blind'] as const
export type CountType = (typeof COUNT_TYPES)[number]

export const EXPIRY_TREATMENTS = ['fresh', 'cooked', 'frozen', 'preserved', 'chilled', 'other'] as const
export type ExpiryTreatment = (typeof EXPIRY_TREATMENTS)[number]

// === Interfaces ===

export interface StockReservation {
  id: string
  hotel_id: string
  event_id: string
  product_id: string
  lot_id: string | null
  qty_reserved: number
  qty_consumed: number
  status: ReservationStatus
  is_shortfall: boolean
  unit_cost_at_reservation: number | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joined
  product_name?: string
  lot_number?: string | null
  expiry_date?: string | null
  qty_available?: number
  total_cost?: number | null
}

export interface ExpiryRule {
  id: string
  hotel_id: string
  product_id: string | null
  treatment: ExpiryTreatment
  max_days_after_opening: number | null
  max_days_ambient: number | null
  notes: string | null
  created_at: string
}

export interface StockCount {
  id: string
  hotel_id: string
  count_type: CountType
  status: CountStatus
  is_blind: boolean
  location_id: string | null
  label: string | null
  notes: string | null
  started_at: string
  closed_at: string | null
  created_by: string
  reviewed_by: string | null
  created_at: string
  // derived
  total_lines?: number
  submitted_lines?: number
  lines_with_variance?: number
}

export interface StockCountLine {
  id: string
  count_id: string
  hotel_id: string
  product_id: string
  lot_id: string | null
  expected_qty: number | null
  counted_qty: number | null
  variance_qty: number | null
  adjustment_applied: boolean
  notes: string | null
  submitted_by: string | null
  submitted_at: string | null
  created_at: string
  // joined
  product?: { id: string; name: string }
  lot?: { id: string; lot_number: string | null; expiry_date: string | null }
}

export interface StockForensics {
  product_id: string
  period_months: number
  since: string
  received: number
  consumed_from_reservations: number
  consumed_direct: number
  waste_recorded: number
  adjustments_positive: number
  adjustments_negative: number
  unexplained_loss: number
  unexplained_surplus: number
  waste_rate_pct: number | null
  unexplained_loss_rate_pct: number
  alert: 'ok' | 'warning' | 'critical'
}

// === Labels ===

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  consumed: 'Consumida',
  released: 'Liberada',
}

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'text-warning',
  partial: 'text-info',
  consumed: 'text-success',
  released: 'text-text-muted',
}

export const COUNT_STATUS_LABELS: Record<CountStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  review: 'Revisión',
  closed: 'Cerrado',
}

export const COUNT_STATUS_COLORS: Record<CountStatus, string> = {
  open: 'text-warning',
  in_progress: 'text-info',
  review: 'text-accent',
  closed: 'text-success',
}

/** Left-border / badge-status variant (DESIGN.md §Left-Border Status System) */
export const COUNT_STATUS_VARIANT: Record<CountStatus, 'warning' | 'info' | 'neutral' | 'success'> = {
  open: 'warning',
  in_progress: 'info',
  review: 'neutral',
  closed: 'success',
}

export const COUNT_TYPE_LABELS: Record<CountType, string> = {
  full: 'Completo',
  partial: 'Parcial',
  blind: 'Ciego',
}

export const EXPIRY_TREATMENT_LABELS: Record<ExpiryTreatment, string> = {
  fresh: 'Fresco',
  cooked: 'Cocinado',
  frozen: 'Congelado',
  preserved: 'Conserva',
  chilled: 'Refrigerado',
  other: 'Otro',
}

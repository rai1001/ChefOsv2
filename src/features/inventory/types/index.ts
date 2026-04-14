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

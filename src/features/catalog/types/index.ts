// M3 Catalog & Suppliers — Types

export const STORAGE_TYPES = ['ambient', 'refrigerated', 'frozen'] as const
export type StorageType = (typeof STORAGE_TYPES)[number]

export const ALIAS_SOURCES = ['manual', 'ocr', 'voice'] as const
export type AliasSource = (typeof ALIAS_SOURCES)[number]

// === Interfaces ===

export interface Category {
  id: string
  hotel_id: string
  parent_id: string | null
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  hotel_id: string
  category_id: string | null
  name: string
  description: string | null
  sku: string | null
  default_unit_id: string | null
  min_stock: number | null
  max_stock: number | null
  reorder_point: number | null
  allergens: string[]
  storage_type: StorageType
  shelf_life_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  category?: Pick<Category, 'id' | 'name'>
  default_unit?: { id: string; abbreviation: string }
}

export interface ProductAlias {
  id: string
  hotel_id: string
  product_id: string
  alias_name: string
  source_type: AliasSource
  confidence_score: number
  created_at: string
}

export interface Supplier {
  id: string
  hotel_id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  payment_terms: string | null
  delivery_days: string[]
  min_order_amount: number | null
  rating: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupplierOffer {
  id: string
  hotel_id: string
  supplier_id: string
  product_id: string
  unit_id: string | null
  unit_price: number
  min_quantity: number | null
  valid_from: string | null
  valid_to: string | null
  is_preferred: boolean
  sku_supplier: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  supplier?: Pick<Supplier, 'id' | 'name'>
  product?: Pick<Product, 'id' | 'name'>
  unit?: { id: string; abbreviation: string }
}

// === Labels ===

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  ambient: 'Ambiente',
  refrigerated: 'Refrigerado',
  frozen: 'Congelado',
}

export const STORAGE_TYPE_COLORS: Record<StorageType, string> = {
  ambient: 'text-text-secondary',
  refrigerated: 'text-info',
  frozen: 'text-accent',
}

export const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

// === M3 Extended ===

export const INCIDENT_TYPES = [
  'delay',
  'quality',
  'quantity',
  'wrong_product',
  'no_delivery',
  'other',
] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  delay: 'Retraso',
  quality: 'Calidad',
  quantity: 'Cantidad',
  wrong_product: 'Producto erróneo',
  no_delivery: 'No entrega',
  other: 'Otro',
}

export const INCIDENT_SEVERITIES = ['info', 'warning', 'critical'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  info: 'Info',
  warning: 'Aviso',
  critical: 'Crítico',
}

export interface SupplierConfig {
  id: string
  hotel_id: string
  supplier_id: string
  delivery_days: string[]
  cutoff_time: string | null
  lead_time_hours: number | null
  min_order_amount: number | null
  min_order_units: number | null
  reception_window_start: string | null
  reception_window_end: string | null
  allows_urgent_delivery: boolean
  created_at: string
  updated_at: string
}

export interface SupplierIncident {
  id: string
  hotel_id: string
  supplier_id: string
  purchase_order_id: string | null
  incident_type: IncidentType
  description: string | null
  severity: IncidentSeverity
  occurred_at: string
  recorded_by: string | null
  created_at: string
}

export interface PriceHistoryEntry {
  id: string
  hotel_id: string
  product_id: string
  supplier_id: string
  offer_id: string | null
  recorded_at: string
  old_price: number | null
  new_price: number
  variation_pct: number | null
}

export interface ProductSupplierRef {
  id: string
  hotel_id: string
  product_id: string
  supplier_id: string
  supplier_code: string
  supplier_name: string | null
  purchase_unit_id: string | null
  conversion_factor: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SupplierMetrics {
  supplier_id: string
  total_orders: number
  completed_orders: number
  completion_rate_pct: number | null
  incidents_30d: number
  critical_incidents_30d: number
  rating: number
}

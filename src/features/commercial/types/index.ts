// M1 Commercial — Types

export const EVENT_STATUSES = [
  'draft',
  'pending_confirmation',
  'confirmed',
  'in_preparation',
  'in_operation',
  'completed',
  'cancelled',
  'archived',
] as const

export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EVENT_TYPES = [
  'banquet',
  'buffet',
  'coffee_break',
  'cocktail',
  'room_service',
  'catering',
  'restaurant',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export const SERVICE_TYPES = ['buffet', 'seated', 'cocktail', 'mixed'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const VIP_LEVELS = ['standard', 'silver', 'gold', 'platinum'] as const
export type VipLevel = (typeof VIP_LEVELS)[number]

export interface Client {
  id: string
  hotel_id: string
  name: string
  company: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  vip_level: VipLevel
  lifetime_value: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  hotel_id: string
  client_id: string | null
  name: string
  event_type: EventType
  service_type: ServiceType
  event_date: string
  start_time: string | null
  end_time: string | null
  guest_count: number
  venue: string | null
  setup_time: string | null
  teardown_time: string | null
  status: EventStatus
  notes: string | null
  beo_number: string | null
  cancel_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  name: string
  event_type: EventType
  service_type: ServiceType
  event_date: string
  start_time: string | null
  end_time: string | null
  guest_count: number
  venue: string | null
  status: EventStatus
  beo_number: string | null
  client_name: string | null
}

// Labels para UI
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  banquet: 'Banquete',
  buffet: 'Buffet',
  coffee_break: 'Coffee Break',
  cocktail: 'Cocktail',
  room_service: 'Room Service',
  catering: 'Catering',
  restaurant: 'Restaurante',
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  buffet: 'Buffet',
  seated: 'Emplatado',
  cocktail: 'Cocktail',
  mixed: 'Mixto',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Borrador',
  pending_confirmation: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  in_operation: 'En operación',
  completed: 'Completado',
  cancelled: 'Cancelado',
  archived: 'Archivado',
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'text-text-muted',
  pending_confirmation: 'text-warning',
  confirmed: 'text-success',
  in_preparation: 'text-info',
  in_operation: 'text-accent',
  completed: 'text-success',
  cancelled: 'text-danger',
  archived: 'text-text-muted',
}

/** Variante de left-border / badge-status (DESIGN.md §Left-Border Status System) */
export const EVENT_STATUS_VARIANT: Record<EventStatus, 'neutral' | 'warning' | 'success' | 'info' | 'urgent'> = {
  draft: 'neutral',
  pending_confirmation: 'warning',
  confirmed: 'success',
  in_preparation: 'info',
  in_operation: 'warning',
  completed: 'success',
  cancelled: 'urgent',
  archived: 'neutral',
}

// ─── BEO types ────────────────────────────────────────────────────────────────

export interface BeoRecipe {
  id: string
  name: string
  servings_override: number | null
  unit_cost: number | null
  yield_pct: number | null
}

export interface BeoSection {
  id: string
  name: string
  course_type: string | null
  recipes: BeoRecipe[]
}

export interface BeoMenu {
  id: string
  menu_name: string
  sort_order: number
  servings_override: number | null
  sections: BeoSection[]
}

export interface BeoImpactItem {
  product_id: string | null
  product_name: string
  quantity_needed: number
  unit: string | null
}

export interface BeoImpactByDept {
  department: string
  items: BeoImpactItem[]
}

export interface BeoSpace {
  space_name: string
  capacity: number | null
  setup_style: string | null
}

export interface BeoClient {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

export interface BeoData {
  id: string
  beo_number: string | null
  name: string
  event_type: EventType
  service_type: ServiceType
  event_date: string
  start_time: string | null
  end_time: string | null
  guest_count: number
  venue: string | null
  setup_time: string | null
  teardown_time: string | null
  status: EventStatus
  notes: string | null
  theoretical_cost: number | null
  actual_cost: number | null
  client: BeoClient | null
  hotel: { id: string; name: string }
  menus: BeoMenu[]
  operational_impact: BeoImpactByDept[]
  spaces: BeoSpace[]
}

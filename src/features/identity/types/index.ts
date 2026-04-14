// D0 Identity — Types

export const ROLES = [
  'superadmin',
  'direction',
  'admin',
  'head_chef',
  'sous_chef',
  'cook',
  'commercial',
  'procurement',
  'warehouse',
  'room',
  'reception',
  'operations',
  'maintenance',
] as const

export type Role = (typeof ROLES)[number]

/** Perfiles UX: agrupan roles para navegación adaptativa */
export type UXProfile = 'cocina' | 'oficina' | 'compras' | 'comercial'

export const ROLE_TO_PROFILE: Record<Role, UXProfile> = {
  head_chef: 'cocina',
  sous_chef: 'cocina',
  cook: 'cocina',
  direction: 'oficina',
  admin: 'oficina',
  superadmin: 'oficina',
  commercial: 'comercial',
  operations: 'comercial',
  room: 'comercial',
  reception: 'comercial',
  procurement: 'compras',
  warehouse: 'compras',
  maintenance: 'cocina',
}

export interface Tenant {
  id: string
  name: string
  created_at: string
}

export interface Hotel {
  id: string
  tenant_id: string
  name: string
  slug: string
  timezone: string
  currency: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  updated_at: string
}

export interface Membership {
  id: string
  user_id: string
  hotel_id: string
  tenant_id: string
  role: Role
  is_active: boolean
  is_default: boolean
  created_at: string
}

/** Membership con datos del hotel incluidos */
export interface MembershipWithHotel extends Membership {
  hotel: Pick<Hotel, 'id' | 'name' | 'slug' | 'timezone' | 'currency'>
}

export interface AuditLog {
  id: string
  hotel_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface DomainEvent {
  id: string
  hotel_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload: Record<string, unknown>
  version: number
  processed_at: string | null
  created_at: string
}

// Permissions matrix
export const PERMISSIONS = {
  'hotel.manage': ['superadmin', 'direction', 'admin'],
  'team.manage': ['superadmin', 'direction', 'admin'],
  'event.create': ['commercial', 'direction', 'admin'],
  'event.confirm': ['commercial', 'direction', 'admin'],
  'event.cancel': ['direction', 'admin'],
  'recipe.create': ['head_chef', 'sous_chef', 'cook', 'direction', 'admin'],
  'recipe.approve': ['head_chef', 'direction'],
  'catalog.manage': ['procurement', 'head_chef', 'direction', 'admin'],
  'procurement.create': ['procurement', 'head_chef', 'direction', 'admin'],
  'procurement.approve': ['direction', 'admin'],
  'inventory.manage': ['procurement', 'warehouse', 'head_chef', 'direction', 'admin'],
  'inventory.adjust': ['direction', 'admin'],
  'production.manage': ['head_chef', 'sous_chef', 'direction'],
  'production.execute': ['head_chef', 'sous_chef', 'cook'],
  'compliance.manage': ['head_chef', 'direction', 'admin'],
  'task.manage': ['head_chef', 'sous_chef', 'room', 'reception', 'direction', 'admin'],
  'dashboard.view': ['direction', 'admin', 'superadmin'],
  'reports.view': ['direction', 'admin', 'head_chef'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

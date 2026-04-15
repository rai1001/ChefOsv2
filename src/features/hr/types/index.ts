// ============================================================
// M13 Personal y Horarios — tipos
// ============================================================

export type PersonnelRole =
  | 'chef_ejecutivo'
  | 'jefe_partida'
  | 'cocinero'
  | 'ayudante_cocina'
  | 'fregador'
  | 'pastelero'
  | 'barista'
  | 'camarero'
  | 'otro'

export type ContractType =
  | 'indefinido'
  | 'temporal'
  | 'formacion'
  | 'autonomo'
  | 'becario'

export type ShiftType = 'normal' | 'refuerzo' | 'evento'
export type ScheduleOrigin = 'regla' | 'evento' | 'ajuste'
export type ScheduleStatus = 'propuesto' | 'confirmado' | 'cancelado'

export interface Personnel {
  id: string
  hotel_id: string
  name: string
  role: PersonnelRole
  secondary_roles: PersonnelRole[]
  contract_type: ContractType
  weekly_hours: number
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftDefinition {
  id: string
  hotel_id: string
  name: string
  start_time: string   // "HH:MM:SS"
  end_time: string     // "HH:MM:SS"
  shift_type: ShiftType
  active: boolean
}

export interface ScheduleRule {
  id: string
  role: PersonnelRole
  days_of_week: number[]    // 1=Lun … 7=Dom
  shift_id: string
  shift_name: string
  shift_start: string
  shift_end: string
  min_persons: number
  max_persons: number | null
  priority: 'normal' | 'alta'
  active: boolean
}

export interface ScheduleAssignment {
  id: string
  personnel_id: string
  personnel_name: string
  personnel_role: PersonnelRole
  shift_id: string
  shift_name: string
  shift_start: string
  shift_end: string
  shift_type: ShiftType
  work_date: string   // "YYYY-MM-DD"
  origin: ScheduleOrigin
  status: ScheduleStatus
  notes: string | null
}

// ──────────────────────────────────────────
// Labels y arrays de opciones para la UI
// ──────────────────────────────────────────

export const PERSONNEL_ROLES: PersonnelRole[] = [
  'chef_ejecutivo',
  'jefe_partida',
  'cocinero',
  'ayudante_cocina',
  'fregador',
  'pastelero',
  'barista',
  'camarero',
  'otro',
]

export const PERSONNEL_ROLE_LABELS: Record<PersonnelRole, string> = {
  chef_ejecutivo:  'Chef Ejecutivo',
  jefe_partida:    'Jefe de Partida',
  cocinero:        'Cocinero/a',
  ayudante_cocina: 'Ayudante de Cocina',
  fregador:        'Fregador/a',
  pastelero:       'Pastelero/a',
  barista:         'Barista',
  camarero:        'Camarero/a',
  otro:            'Otro',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  indefinido: 'Indefinido',
  temporal:   'Temporal',
  formacion:  'Formación',
  autonomo:   'Autónomo',
  becario:    'Becario/a',
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  normal:   'Normal',
  refuerzo: 'Refuerzo',
  evento:   'Evento',
}

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  propuesto:  'Propuesto',
  confirmado: 'Confirmado',
  cancelado:  'Cancelado',
}

// 1=Lun … 7=Dom
export const DAY_SHORT_LABELS: Record<number, string> = {
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
  7: 'D',
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

// Helpers de tiempo
export function formatTime(t: string): string {
  // "08:00:00" → "08:00"
  return t?.slice(0, 5) ?? ''
}

export function shiftDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60  // overnight
  return Math.round(mins / 60 * 10) / 10
}

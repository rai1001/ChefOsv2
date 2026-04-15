// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export const APPCC_CATEGORIES = ['recepcion','almacen','preparacion','coccion','enfriamiento','servicio','limpieza'] as const;
export type AppccCategory = typeof APPCC_CATEGORIES[number];

export const APPCC_CATEGORY_LABELS: Record<AppccCategory, string> = {
  recepcion:    'Recepción',
  almacen:      'Almacenamiento',
  preparacion:  'Preparación',
  coccion:      'Cocción',
  enfriamiento: 'Enfriamiento',
  servicio:     'Servicio',
  limpieza:     'Limpieza',
};

export const APPCC_RECORD_STATUSES = ['ok','deviation','corrected','critical','na'] as const;
export type AppccRecordStatus = typeof APPCC_RECORD_STATUSES[number];

export const APPCC_STATUS_LABELS: Record<AppccRecordStatus, string> = {
  ok:        'Conforme',
  deviation: 'Desviación',
  corrected: 'Corregido',
  critical:  'Crítico',
  na:        'N/A',
};

export const APPCC_STATUS_COLORS: Record<AppccRecordStatus, string> = {
  ok:        'text-success bg-bg-card',
  deviation: 'text-warning bg-bg-card',
  corrected: 'text-info bg-bg-card',
  critical:  'text-danger bg-bg-card',
  na:        'text-text-muted bg-bg-card',
};

/** Left-border / badge-status variant (DESIGN.md §Left-Border Status System) */
export const APPCC_STATUS_VARIANT: Record<AppccRecordStatus, 'success' | 'warning' | 'info' | 'urgent' | 'neutral'> = {
  ok:        'success',
  deviation: 'warning',
  corrected: 'info',
  critical:  'urgent',
  na:        'neutral',
};

export const LABEL_TYPES = ['preparacion','producto','sobras','congelado','descongelado','pasteurizado','regenerado'] as const;
export type LabelType = typeof LABEL_TYPES[number];

export const LABEL_TYPE_LABELS: Record<LabelType, string> = {
  preparacion:  'Preparación',
  producto:     'Producto abierto',
  sobras:       'Sobras',
  congelado:    'Congelado',
  descongelado: 'Descongelado',
  pasteurizado: 'Pasteurizado',
  regenerado:   'Regenerado',
};

export const TREATMENT_TYPES = ['none','congelado','descongelado','pasteurizado','regenerado'] as const;
export type TreatmentType = typeof TREATMENT_TYPES[number];

export const TREATMENT_LABELS: Record<TreatmentType, string> = {
  none:         'Sin tratamiento',
  congelado:    'Congelado',
  descongelado: 'Descongelado',
  pasteurizado: 'Pasteurizado',
  regenerado:   'Regenerado',
};

export const LABEL_ORIGINS = ['produccion','evento','recepcion','manual'] as const;
export type LabelOrigin = typeof LABEL_ORIGINS[number];

export const LABEL_ORIGIN_LABELS: Record<LabelOrigin, string> = {
  produccion: 'Producción',
  evento:     'Evento',
  recepcion:  'Recepción',
  manual:     'Manual',
};

// ─────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────

export interface AppccTemplate {
  id: string;
  hotel_id: string;
  name: string;
  category: AppccCategory;
  description: string | null;
  control_point: string;
  critical_limit: string;
  corrective_action: string;
  frequency: string;
  responsible_role: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppccRecord {
  record_id: string | null;
  template_id: string;
  template_name: string;
  category: AppccCategory;
  control_point: string;
  critical_limit: string;
  corrective_action: string;
  frequency: string;
  sort_order: number;
  // record fields (null = not yet filled for this date)
  status: AppccRecordStatus | null;
  value_measured: string | null;
  observations: string | null;
  corrective_action_taken: string | null;
  checked_at: string | null;
  checked_by: string | null;
}

export interface TemperatureLog {
  id: string;
  location: string;
  product_name: string | null;
  temperature: number;
  unit: string;
  min_allowed: number | null;
  max_allowed: number | null;
  is_within_range: boolean | null;
  logged_at: string;
  notes: string | null;
}

export interface Label {
  id: string;
  barcode: string;
  label_type: LabelType;
  display_name: string;
  quantity: number;
  unit: string;
  treatment: TreatmentType;
  elaborated_at: string | null;
  expires_at: string;
  location: string | null;
  origin: LabelOrigin;
  is_printed: boolean;
  printed_at: string | null;
  created_at: string;
  hours_to_expiry: number;
}

export interface LotMovement {
  id: string;
  type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface LotReservation {
  id: string;
  event_id: string;
  event_name: string;
  qty_reserved: number;
  qty_consumed: number;
  status: string;
  created_at: string;
}

export interface LotLabel {
  id: string;
  barcode: string;
  label_type: LabelType;
  display_name: string;
  quantity: number;
  unit: string;
  expires_at: string;
  is_printed: boolean;
  created_at: string;
}

export interface TraceabilityChain {
  lot: {
    id: string;
    product_id: string;
    product_name: string;
    category: string | null;
    quantity: number;
    unit: string;
    unit_cost: number;
    expiry_date: string | null;
    location: string | null;
    created_at: string;
  };
  movements: LotMovement[];
  reservations: LotReservation[];
  labels: LotLabel[];
}

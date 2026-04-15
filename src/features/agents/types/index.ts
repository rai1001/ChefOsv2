// ============================================================================
// M15 Agentes Autónomos — tipos y constantes
// ============================================================================

export type AgentType =
  // Grupo A: Automejora
  | 'price_watcher'
  | 'waste_analyzer'
  | 'stock_optimizer'
  | 'recipe_cost_alert'
  | 'compliance_reminder'
  // Grupo B: Coordinación evento
  | 'event_planner'
  | 'shopping_optimizer'
  | 'kds_coordinator'
  | 'post_event'
  | 'forecast_prep'

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'expired'

export type SuggestionAction =
  | 'enqueue_job'
  | 'sync_recipe_costs'
  | 'create_notification'
  | 'none'

export interface AgentSuggestion {
  id: string
  agent_type: AgentType
  status: SuggestionStatus
  title: string
  description: string
  action: SuggestionAction
  action_payload: Record<string, unknown>
  evidence: Record<string, unknown>
  context_type: string | null
  context_id: string | null
  expires_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
}

export interface AgentConfig {
  agent_type: AgentType
  is_active: boolean
  config: Record<string, unknown>
}

// ── Labels ──────────────────────────────────────────────────────────────────

export const AGENT_LABELS: Record<AgentType, string> = {
  price_watcher:       'Monitor de Precios',
  waste_analyzer:      'Análisis de Mermas',
  stock_optimizer:     'Optimizador de Stock',
  recipe_cost_alert:   'Alerta Food Cost',
  compliance_reminder: 'Recordatorio APPCC',
  event_planner:       'Planificador de Evento',
  shopping_optimizer:  'Optimizador de Compras',
  kds_coordinator:     'Coordinador KDS',
  post_event:          'Cierre de Evento',
  forecast_prep:       'Preparación Forecast',
}

export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  price_watcher:       'Detecta variaciones de precio >5% y sugiere actualizar escandallos.',
  waste_analyzer:      'Analiza mermas semanales elevadas por producto.',
  stock_optimizer:     'Compara stock disponible con reservas de próximos eventos.',
  recipe_cost_alert:   'Identifica recetas con food cost% por encima del objetivo.',
  compliance_reminder: 'Recuerda plantillas APPCC pendientes del día.',
  event_planner:       'Al confirmar un evento, sugiere workflow + reserva stock + coste.',
  shopping_optimizer:  'Detecta solicitudes de compra sin consolidar por proveedor.',
  kds_coordinator:     'Verifica que los eventos tengan órdenes KDS creadas.',
  post_event:          'Tras finalizar un evento, sugiere calcular coste real y snapshot.',
  forecast_prep:       'Genera el snapshot KPI diario para el historial de analytics.',
}

export const AGENT_GROUP: Record<AgentType, 'automejora' | 'evento'> = {
  price_watcher:       'automejora',
  waste_analyzer:      'automejora',
  stock_optimizer:     'automejora',
  recipe_cost_alert:   'automejora',
  compliance_reminder: 'automejora',
  event_planner:       'evento',
  shopping_optimizer:  'evento',
  kds_coordinator:     'evento',
  post_event:          'evento',
  forecast_prep:       'evento',
}

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending:  'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  applied:  'Aplicada',
  expired:  'Expirada',
}

export const SUGGESTION_STATUS_COLORS: Record<SuggestionStatus, string> = {
  pending:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  approved: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
  applied:  'bg-green-500/15 text-green-400 border border-green-500/30',
  expired:  'bg-neutral-500/15 text-neutral-400 border border-neutral-500/30',
}

/** Left-border / badge-status variant (DESIGN.md §Left-Border Status System) */
export const SUGGESTION_STATUS_VARIANT: Record<SuggestionStatus, 'neutral' | 'warning' | 'info' | 'success' | 'urgent'> = {
  pending:  'warning',
  approved: 'info',
  rejected: 'urgent',
  applied:  'success',
  expired:  'neutral',
}

export const ACTION_LABELS: Record<SuggestionAction, string> = {
  enqueue_job:        'Encolar tarea',
  sync_recipe_costs:  'Sincronizar costes',
  create_notification:'Notificar equipo',
  none:               'Solo informativo',
}

export const AGENT_TYPES_AUTOMEJORA: AgentType[] = [
  'price_watcher',
  'waste_analyzer',
  'stock_optimizer',
  'recipe_cost_alert',
  'compliance_reminder',
]

export const AGENT_TYPES_EVENTO: AgentType[] = [
  'event_planner',
  'shopping_optimizer',
  'kds_coordinator',
  'post_event',
  'forecast_prep',
]

// Configuración por defecto para cada agente
export const AGENT_DEFAULT_CONFIG: Record<AgentType, Record<string, unknown>> = {
  price_watcher:       { price_change_threshold_pct: 5 },
  waste_analyzer:      { waste_value_threshold_eur: 10, lookback_days: 7 },
  stock_optimizer:     { lookahead_days: 7, safety_days: 2 },
  recipe_cost_alert:   { food_cost_target_pct: 35 },
  compliance_reminder: { remind_hours_before: 2 },
  event_planner:       {},
  shopping_optimizer:  {},
  kds_coordinator:     {},
  post_event:          {},
  forecast_prep:       {},
}

// Labels de configuración (para el formulario de config)
export interface ConfigField {
  key: string
  label: string
  suffix?: string
  min?: number
  max?: number
}

export const AGENT_CONFIG_FIELDS: Record<AgentType, ConfigField[]> = {
  price_watcher:       [{ key: 'price_change_threshold_pct', label: 'Umbral variación precio', suffix: '%', min: 1, max: 50 }],
  waste_analyzer:      [
    { key: 'waste_value_threshold_eur', label: 'Umbral valor merma', suffix: '€', min: 1 },
    { key: 'lookback_days', label: 'Días de análisis', suffix: 'días', min: 1, max: 30 },
  ],
  stock_optimizer:     [
    { key: 'lookahead_days', label: 'Días vista', suffix: 'días', min: 1, max: 30 },
    { key: 'safety_days', label: 'Días seguridad', suffix: 'días', min: 0, max: 14 },
  ],
  recipe_cost_alert:   [{ key: 'food_cost_target_pct', label: 'Objetivo food cost', suffix: '%', min: 10, max: 80 }],
  compliance_reminder: [{ key: 'remind_hours_before', label: 'Recordar con antelación', suffix: 'horas', min: 1, max: 24 }],
  event_planner:       [],
  shopping_optimizer:  [],
  kds_coordinator:     [],
  post_event:          [],
  forecast_prep:       [],
}

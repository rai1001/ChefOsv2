// ============================================================================
// M12 Integraciones PMS/POS — tipos y constantes
// ============================================================================

export type PmsType = 'mews' | 'opera_cloud' | 'cloudbeds' | 'protel'
export type PosType = 'lightspeed' | 'simphony' | 'square' | 'revel'
export type IntegrationStatus = 'draft' | 'active' | 'error' | 'disabled'
export type SyncLogStatus = 'running' | 'success' | 'partial' | 'failed'

// Etiquetas para UI
export const PMS_TYPE_LABELS: Record<PmsType, string> = {
  mews:        'Mews',
  opera_cloud: 'OPERA Cloud',
  cloudbeds:   'Cloudbeds',
  protel:      'Protel',
}

export const POS_TYPE_LABELS: Record<PosType, string> = {
  lightspeed: 'Lightspeed',
  simphony:   'Oracle Simphony',
  square:     'Square',
  revel:      'Revel Systems',
}

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  draft:    'Sin probar',
  active:   'Activa',
  error:    'Error',
  disabled: 'Deshabilitada',
}

export const INTEGRATION_STATUS_COLORS: Record<IntegrationStatus, string> = {
  draft:    'text-gray-500 bg-gray-100',
  active:   'text-green-700 bg-green-100',
  error:    'text-red-700 bg-red-100',
  disabled: 'text-gray-400 bg-gray-100',
}

export const SYNC_LOG_STATUS_LABELS: Record<SyncLogStatus, string> = {
  running: 'En curso',
  success: 'OK',
  partial: 'Parcial',
  failed:  'Fallido',
}

export const SYNC_LOG_STATUS_COLORS: Record<SyncLogStatus, string> = {
  running: 'text-blue-600 bg-blue-50',
  success: 'text-green-700 bg-green-100',
  partial: 'text-amber-700 bg-amber-100',
  failed:  'text-red-700 bg-red-100',
}

// ============================================================================
// Interfaces de datos
// ============================================================================

export interface PmsIntegration {
  id:           string
  pms_type:     PmsType
  name:         string
  status:       IntegrationStatus
  config:       PmsConfig
  last_sync_at: string | null
  last_error:   string | null
  is_active:    boolean
  created_at:   string
}

export interface PosIntegration {
  id:           string
  pos_type:     PosType
  name:         string
  status:       IntegrationStatus
  config:       PosConfig
  last_sync_at: string | null
  last_error:   string | null
  is_active:    boolean
  created_at:   string
}

export interface IntegrationSyncLog {
  id:                   string
  pms_integration_id:   string | null
  pos_integration_id:   string | null
  sync_type:            string
  status:               SyncLogStatus
  records_synced:       number
  records_failed:       number
  error_message:        string | null
  response_payload:     Record<string, unknown> | null
  started_at:           string
  completed_at:         string | null
}

// Config JSONB tipada

export interface PmsConfig {
  sync_interval_minutes?: number
  sync_occupancy?:        boolean
  sync_reservations?:     boolean
  field_mappings?:        Record<string, string>
}

export interface PosConfig {
  sync_interval_minutes?: number
  sync_sales?:            boolean
  push_kitchen_orders?:   boolean
  location_id?:           string
}

// ============================================================================
// Credentials por PMS/POS (usadas solo en formularios — nunca se devuelven del servidor)
// ============================================================================

export interface MewsCredentials {
  api_token:   string
  property_id: string
  environment: 'demo' | 'production'
}

export interface OperaCloudCredentials {
  client_id:     string
  client_secret: string
  tenant_name:   string
  server_url:    string
}

export interface CloudbedsCredentials {
  api_key:     string
  property_id: string
}

export interface ProtelCredentials {
  server_url: string
  username:   string
  password:   string
}

export interface LightspeedCredentials {
  client_id:     string
  client_secret: string
  account_id:    string
}

export interface SimphonyCredentials {
  server_url:  string
  employee_id: string
  password:    string
  rvc_ref:     string
}

export interface SquareCredentials {
  access_token: string
  location_id:  string
}

export interface RevelCredentials {
  api_url:    string
  api_key:    string
  api_secret: string
}

// ============================================================================
// Descriptor de los campos de credentials por tipo
// ============================================================================

export interface CredentialField {
  key:         string
  label:       string
  type:        'text' | 'password' | 'select'
  required:    boolean
  placeholder?: string
  options?:    { value: string; label: string }[]
}

export const PMS_CREDENTIAL_FIELDS: Record<PmsType, CredentialField[]> = {
  mews: [
    { key: 'api_token',   label: 'API Token',    type: 'password', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'property_id', label: 'Property ID',  type: 'text',     required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'environment', label: 'Entorno',       type: 'select',   required: true, options: [
        { value: 'demo', label: 'Demo / Sandbox' },
        { value: 'production', label: 'Producción' },
    ]},
  ],
  opera_cloud: [
    { key: 'client_id',     label: 'Client ID',     type: 'text',     required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'tenant_name',   label: 'Tenant Name',   type: 'text',     required: true, placeholder: 'mi-hotel' },
    { key: 'server_url',    label: 'Server URL',     type: 'text',     required: true, placeholder: 'https://hospitality.oracle.com' },
  ],
  cloudbeds: [
    { key: 'api_key',     label: 'API Key',     type: 'password', required: true },
    { key: 'property_id', label: 'Property ID', type: 'text',     required: true },
  ],
  protel: [
    { key: 'server_url', label: 'Server URL', type: 'text',     required: true },
    { key: 'username',   label: 'Usuario',    type: 'text',     required: true },
    { key: 'password',   label: 'Contraseña', type: 'password', required: true },
  ],
}

export const POS_CREDENTIAL_FIELDS: Record<PosType, CredentialField[]> = {
  lightspeed: [
    { key: 'client_id',     label: 'Client ID',     type: 'text',     required: true },
    { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    { key: 'account_id',    label: 'Account ID',    type: 'text',     required: true },
  ],
  simphony: [
    { key: 'server_url',  label: 'Server URL',   type: 'text',     required: true, placeholder: 'https://simphony.example.com' },
    { key: 'employee_id', label: 'Employee ID',  type: 'text',     required: true },
    { key: 'password',    label: 'Contraseña',   type: 'password', required: true },
    { key: 'rvc_ref',     label: 'RVC Reference', type: 'text',    required: true },
  ],
  square: [
    { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    { key: 'location_id',  label: 'Location ID',  type: 'text',     required: true },
  ],
  revel: [
    { key: 'api_url',    label: 'API URL',    type: 'text',     required: true, placeholder: 'https://mi-hotel.revelup.com' },
    { key: 'api_key',    label: 'API Key',    type: 'text',     required: true },
    { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
  ],
}

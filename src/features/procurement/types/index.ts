// M4 Procurement — Types

export const PR_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'consolidated',
  'cancelled',
] as const
export type PrStatus = (typeof PR_STATUSES)[number]

export const PO_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'confirmed_by_supplier',
  'partially_received',
  'received',
  'cancelled',
] as const
export type PoStatus = (typeof PO_STATUSES)[number]

export const URGENCY_LEVELS = ['normal', 'urgent', 'critical'] as const
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number]

export const QUALITY_STATUSES = ['accepted', 'rejected', 'partial'] as const
export type QualityStatus = (typeof QUALITY_STATUSES)[number]

// === Interfaces ===

export interface PurchaseRequest {
  id: string
  hotel_id: string
  event_id: string | null
  request_number: string
  requested_by: string
  status: PrStatus
  urgency: UrgencyLevel
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  // joined
  lines?: PurchaseRequestLine[]
  event?: { id: string; name: string }
}

export interface PurchaseRequestLine {
  id: string
  request_id: string
  hotel_id: string
  product_id: string
  unit_id: string | null
  quantity_requested: number
  sort_order: number
  notes: string | null
  created_at: string
  // joined
  product?: { id: string; name: string }
  unit?: { id: string; abbreviation: string }
}

export interface PurchaseOrder {
  id: string
  hotel_id: string
  supplier_id: string
  order_number: string
  status: PoStatus
  expected_delivery_date: string | null
  total_amount: number
  payment_terms: string | null
  notes: string | null
  created_by: string
  approved_by: string | null
  approved_at: string | null
  sent_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  // joined
  supplier?: { id: string; name: string }
  lines?: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  order_id: string
  hotel_id: string
  product_id: string
  unit_id: string | null
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  sort_order: number
  notes: string | null
  created_at: string
  // joined
  product?: { id: string; name: string }
  unit?: { id: string; abbreviation: string }
}

export interface GoodsReceipt {
  id: string
  order_id: string
  hotel_id: string
  receipt_number: string
  delivery_note_number: string | null
  delivery_note_image: string | null
  ocr_data: Record<string, unknown> | null
  temperature_check: boolean | null
  notes: string | null
  received_by: string
  received_at: string
  created_at: string
  // joined
  lines?: GoodsReceiptLine[]
}

export interface GoodsReceiptLine {
  id: string
  receipt_id: string
  order_line_id: string
  hotel_id: string
  quantity_received: number
  lot_number: string | null
  expiry_date: string | null
  unit_cost: number | null
  quality_status: QualityStatus
  rejection_reason: string | null
  created_at: string
}

// === Labels ===

export const PR_STATUS_LABELS: Record<PrStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente',
  approved: 'Aprobada',
  consolidated: 'Consolidada',
  cancelled: 'Cancelada',
}

export const PR_STATUS_COLORS: Record<PrStatus, string> = {
  draft: 'text-text-muted',
  pending_approval: 'text-warning',
  approved: 'text-success',
  consolidated: 'text-info',
  cancelled: 'text-danger',
}

export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente',
  approved: 'Aprobada',
  sent: 'Enviada',
  confirmed_by_supplier: 'Confirmada',
  partially_received: 'Parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
}

export const PO_STATUS_COLORS: Record<PoStatus, string> = {
  draft: 'text-text-muted',
  pending_approval: 'text-warning',
  approved: 'text-success',
  sent: 'text-info',
  confirmed_by_supplier: 'text-accent',
  partially_received: 'text-warning',
  received: 'text-success',
  cancelled: 'text-danger',
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: 'Normal',
  urgent: 'Urgente',
  critical: 'Critico',
}

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  normal: 'text-text-secondary',
  urgent: 'text-warning',
  critical: 'text-danger',
}

export const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  partial: 'Parcial',
}

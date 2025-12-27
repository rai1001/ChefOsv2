import type { Unit } from './inventory';

export type PurchaseStatus = 'DRAFT' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED';

export interface PurchaseOrderItem {
    ingredientId: string;
    quantity: number;
    unit: Unit;
    costPerUnit: number;
    receivedQuantity?: number; // For partial/full reception
    tempDescription?: string; // For items from OCR not yet matched to an ingredient
}

export type PurchaseOrderType = 'AUTOMATIC' | 'MANUAL';

export interface PurchaseOrderHistoryEntry {
    date: string;
    status: PurchaseStatus;
    userId: string;
    notes?: string;
}

export interface PurchaseOrder {
    id: string;
    orderNumber: string; // "PED-20231222-01"
    supplierId: string;
    date: string; // Creation date ISO (createdAt)
    updatedAt?: string;
    deliveryDate?: string;
    orderDeadline?: string; // Latest date to order by to meet lead time
    status: PurchaseStatus;
    items: PurchaseOrderItem[];
    totalCost: number; // Same as totalAmount
    outletId: string; // Made required for strictness
    eventId?: string; // Link to an event

    // New fields
    type: PurchaseOrderType; // Equivalent to generatedBy
    generatedAt?: string; // If automatic
    notes?: string;
    approvedBy?: string;
    rejectedBy?: string;
    sentAt?: string;
    deliveryNotes?: string;
    actualDeliveryDate?: string;
    history?: PurchaseOrderHistoryEntry[];

    // Phase 2: Logistics
    deliveryAddress?: string;
    deliveryWindow?: string;
    contactPerson?: string;
    logisticsNotes?: string;
}

export interface PurchaseOrderFilters {
    status?: string;
    supplierId?: string | null; // null means "SIN_ASIGNAR"
}

export type SupplierSelectionStrategy = 'CHEAPEST' | 'FASTEST';

export interface AutoPurchaseSettings {
    enabled: boolean;
    runFrequency: 'DAILY' | 'WEEKLY';
    runDay?: number; // 0-6
    runTime?: string; // "23:00"
    generateDraftsOnly: boolean; // If true, creates DRAFT. If false, could auto-send (future)
    supplierSelectionStrategy: SupplierSelectionStrategy;
    outletId?: string;
}

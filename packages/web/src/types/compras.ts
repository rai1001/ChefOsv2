/**
 * @file src/types/compras.ts
 * @description Centralized types for the Automatic Purchases Module.
 * exports core entities and defines API request/response shapes.
 */

import type { Ingredient, Batch, Unit } from './inventory';
import type { Supplier } from './suppliers';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseStatus, PurchaseOrderType } from './purchases';
import type { Event } from './index'; // Assuming Event is in main index

// -- Re-exports for convenience --
export type { Ingredient, Batch, Unit, Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseStatus, PurchaseOrderType, Event };

// -- API / Cloud Function Types --

// Request to generate needs
export interface CalculateNeedsRequest {
    outletId: string;
    startDate?: string;
    endDate?: string;
    customBuffer?: number; // % extra
}

export interface IngredientNeed {
    ingredientId: string;
    ingredientName: string;
    quantityNeeded: number;
    currentStock: number;
    missingQuantity: number;
    unit: Unit;
    supplierId?: string;
}

export interface CalculateNeedsResponse {
    needs: IngredientNeed[];
    generatedAt: string;
}

// Request to create Auto Orders from Needs
export interface GenerateOrdersRequest {
    outletId: string;
    needs: IngredientNeed[];
}

export interface GenerateOrdersResponse {
    purchaseOrderIds: string[];
    message: string;
}

// Supplier Email Payload
export interface SendOrderEmailRequest {
    purchaseOrderId: string;
    forceResend?: boolean;
}

export interface SendOrderEmailResponse {
    success: boolean;
    emailId?: string;
    timestamp: string;
}

// -- Utility Types --
export type QuantityComparisonResult = 'EQUAL' | 'GREATER' | 'LESS' | 'INCOMPATIBLE';

// -- Type Guards --

export function isBatch(obj: any): obj is Batch {
    return obj && typeof obj.batchNumber === 'string' && typeof obj.currentQuantity === 'number';
}

export function isPurchaseOrder(obj: any): obj is PurchaseOrder {
    return obj && typeof obj.orderNumber === 'string' && Array.isArray(obj.items);
}

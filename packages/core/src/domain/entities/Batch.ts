import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';

export enum BatchStatus {
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
}

/**
 * Batch representa un lote de ingrediente con trazabilidad FIFO
 */
export interface Batch {
  id: string;
  ingredientId: string;
  outletId: string;
  lotNumber: string;
  quantity: Quantity;
  remainingQuantity: Quantity;
  unitCost: Money;
  totalCost: Money;
  supplier: string;
  expiryDate: Date;
  receivedDate: Date;
  status: BatchStatus;
  invoiceReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBatchDTO {
  ingredientId: string;
  outletId: string;
  lotNumber: string;
  quantity: Quantity;
  unitCost: Money;
  supplier: string;
  expiryDate: Date;
  receivedDate: Date;
  invoiceReference?: string;
  notes?: string;
}

export interface ConsumeBatchDTO {
  batchId: string;
  quantity: Quantity;
  reason: string;
  reference?: string; // Referencia a producción, evento, etc.
}

import { Quantity } from '../value-objects/Quantity';
import { Money } from '../value-objects/Money';

export type StockTransactionType =
  | 'PURCHASE'
  | 'WASTE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'PRODUCTION'
  | 'AUDIT'
  | 'INITIAL_STOCK';

export interface StockTransaction {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: Quantity; // Signed quantity (positive for increase, negative for decrease)
  unitCost: Money;
  type: StockTransactionType;
  date: Date;
  performedBy: string;
  reason?: string;
  referenceId?: string; // Link to Batch, Order, or Event
}

export interface CreateStockTransactionDTO {
  ingredientId: string;
  ingredientName: string;
  quantity: Quantity;
  unitCost: Money;
  type: StockTransactionType;
  performedBy: string;
  reason?: string;
  referenceId?: string;
}

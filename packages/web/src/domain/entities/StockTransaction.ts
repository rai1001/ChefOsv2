import { Unit } from '@/types';

export type StockTransactionType = 'PURCHASE' | 'WASTE' | 'USAGE' | 'AUDIT' | 'ADJUSTMENT' | 'INITIAL_STOCK';

export class StockTransaction {
    constructor(
        public id: string,
        public ingredientId: string,
        public ingredientName: string,
        public quantity: number, // Positive for addition, Negative for subtraction
        public unit: Unit,
        public type: StockTransactionType,
        public date: Date,
        public performedBy: string, // User ID or Name

        // Costing snapshots (important for historical value)
        public costPerUnit: number = 0,

        // Optional Context
        public reason?: string, // e.g., "Spoilage", "Production for Event"
        public batchId?: string, // If linked to a specific batch
        public orderId?: string, // If linked to a Purchase Order
        public relatedEntityId?: string // Generic link (e.g., Recipe ID for USAGE)
    ) { }

    get totalValue(): number {
        return Math.abs(this.quantity) * this.costPerUnit;
    }

    get isPositive(): boolean {
        return this.quantity > 0;
    }
}

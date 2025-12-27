import { StockTransaction } from '../entities/StockTransaction';

export interface IInventoryRepository {
    // Transaction Logging
    addTransaction(transaction: StockTransaction): Promise<void>;

    // Retrieval
    getTransactionsByIngredient(ingredientId: string, limit?: number): Promise<StockTransaction[]>;
    getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]>;

    // Aggregations
    getCurrentStockLevel(ingredientId: string): Promise<number>; // Can be calculated or cached

    // Batch Operations
    getTransactionsForBatch(batchId: string): Promise<StockTransaction[]>;
}

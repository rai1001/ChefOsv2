import { injectable } from 'inversify';
import {
  setDocument,
  updateDocument,
  getDocumentById,
  getCollection,
} from '@/services/firestoreService';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction } from '@/domain/entities/StockTransaction';

@injectable()
export class FirebaseInventoryRepository implements IInventoryRepository {
  private collectionName = 'stock_transactions';
  private ingredientsCollection = 'ingredients';

  async addTransaction(transaction: StockTransaction): Promise<void> {
    // 1. Get current stock
    const ingredient = await getDocumentById<any>(
      this.ingredientsCollection,
      transaction.ingredientId
    );
    if (!ingredient) {
      throw new Error(`Ingredient ${transaction.ingredientId} does not exist`);
    }

    const currentStock = ingredient.stock || 0;
    const newStock = currentStock + transaction.quantity;

    // 2. Prepare data
    const transactionData = {
      id: transaction.id,
      ingredientId: transaction.ingredientId,
      ingredientName: transaction.ingredientName,
      quantity: transaction.quantity,
      unit: transaction.unit,
      type: transaction.type,
      date: transaction.date.toISOString(), // Standardized as ISO string for better Supabase/Firebase compatibility
      performedBy: transaction.performedBy,
      costPerUnit: transaction.costPerUnit,
      reason: transaction.reason || null,
      batchId: transaction.batchId || null,
      orderId: transaction.orderId || null,
      relatedEntityId: transaction.relatedEntityId || null,
    };

    // 3. Persist (Delegated)
    await setDocument(this.collectionName, transaction.id, transactionData as any);
    await updateDocument(this.ingredientsCollection, transaction.ingredientId, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    } as any);
  }

  async addTransactionRecord(
    transaction: StockTransaction,
    _options?: { transaction?: any }
  ): Promise<void> {
    // Note: Options (multi-document transactions) are not fully supported in the delegation layer yet.
    // For single records, we use setDocument.
    await setDocument(this.collectionName, transaction.id, {
      ...transaction,
      date: transaction.date.toISOString(),
    } as any);
  }

  async getTransactionsByIngredient(
    ingredientId: string,
    limitVal: number = 20
  ): Promise<StockTransaction[]> {
    const transactions = await getCollection<any>(this.collectionName);

    return transactions
      .filter((t) => t.ingredientId === ingredientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limitVal)
      .map(this.mapToEntity);
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]> {
    const transactions = await getCollection<any>(this.collectionName);
    const start = startDate.getTime();
    const end = endDate.getTime();

    return transactions
      .filter((t) => {
        const time = new Date(t.date).getTime();
        return time >= start && time <= end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(this.mapToEntity);
  }

  async getCurrentStockLevel(ingredientId: string): Promise<number> {
    const ingredient = await getDocumentById<any>(this.ingredientsCollection, ingredientId);
    return ingredient?.stock || 0;
  }

  async getTransactionsForBatch(batchId: string): Promise<StockTransaction[]> {
    const transactions = await getCollection<any>(this.collectionName);

    return transactions
      .filter((t) => t.batchId === batchId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(this.mapToEntity);
  }

  private mapToEntity(data: any): StockTransaction {
    return new StockTransaction(
      data.id,
      data.ingredientId,
      data.ingredientName,
      data.quantity,
      data.unit,
      data.type,
      new Date(data.date),
      data.performedBy,
      data.costPerUnit,
      data.reason,
      data.batchId,
      data.orderId,
      data.relatedEntityId
    );
  }
}

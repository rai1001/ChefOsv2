import { injectable } from 'inversify';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    runTransaction,
    Timestamp,
    limit as firebaseLimit
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction } from '@/domain/entities/StockTransaction';

@injectable()
export class FirebaseInventoryRepository implements IInventoryRepository {
    private collectionName = 'stock_transactions';
    private ingredientsCollection = 'ingredients';

    async addTransaction(transaction: StockTransaction): Promise<void> {
        // Use a Firestore transaction to ensure Atomic Consistency between the Log and the Aggregate Stock
        await runTransaction(db, async (firebaseTx) => {
            // 1. Reference the Ingredient to update current stock
            const ingredientRef = doc(db, this.ingredientsCollection, transaction.ingredientId);
            const ingredientDoc = await firebaseTx.get(ingredientRef);

            if (!ingredientDoc.exists()) {
                throw new Error(`Ingredient ${transaction.ingredientId} does not exist`);
            }

            const currentStock = ingredientDoc.data().stock || 0;
            const newStock = currentStock + transaction.quantity;

            // 2. Create the Transaction Document Record
            // We use the transaction ID provided, or generate one if strictly needed, 
            // but usually UUIDs are generated in Application layer. 
            // Here we assume transaction.id is valid.
            const transactionRef = doc(db, this.collectionName, transaction.id);

            // Map Entity to Persistence Data
            const transactionData = {
                id: transaction.id,
                ingredientId: transaction.ingredientId,
                ingredientName: transaction.ingredientName,
                quantity: transaction.quantity,
                unit: transaction.unit,
                type: transaction.type,
                date: Timestamp.fromDate(transaction.date), // Convert JS Date to Firestore Timestamp
                performedBy: transaction.performedBy,
                costPerUnit: transaction.costPerUnit,
                reason: transaction.reason || null,
                batchId: transaction.batchId || null,
                orderId: transaction.orderId || null,
                relatedEntityId: transaction.relatedEntityId || null
            };

            // 3. Execute Writes
            firebaseTx.set(transactionRef, transactionData);
            firebaseTx.update(ingredientRef, {
                stock: newStock,
                updatedAt: new Date().toISOString()
            });
        });
    }

    async getTransactionsByIngredient(ingredientId: string, limitVal: number = 20): Promise<StockTransaction[]> {
        const q = query(
            collection(db, this.collectionName),
            where('ingredientId', '==', ingredientId),
            orderBy('date', 'desc'),
            firebaseLimit(limitVal)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(this.mapDocToEntity);
    }

    async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]> {
        const q = query(
            collection(db, this.collectionName),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(this.mapDocToEntity);
    }

    async getCurrentStockLevel(ingredientId: string): Promise<number> {
        // We trust the aggregated 'stock' field on the Ingredient document
        const ingredientRef = doc(db, this.ingredientsCollection, ingredientId);
        // Note: We can't use 'await' inside a non-async function if we weren't just calling getDoc, 
        // but here we are in an async method.
        // However, to strictly implement "get", usually we might reuse IngredientRepo or just fetch here.
        // Fetching directly for speed.
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(ingredientRef));

        if (docSnap.exists()) {
            return docSnap.data().stock || 0;
        }
        return 0;
    }

    async getTransactionsForBatch(batchId: string): Promise<StockTransaction[]> {
        const q = query(
            collection(db, this.collectionName),
            where('batchId', '==', batchId),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(this.mapDocToEntity);
    }

    // Helper to map Firestore data to Domain Entity
    private mapDocToEntity(doc: any): StockTransaction {
        const data = doc.data();
        return new StockTransaction(
            data.id,
            data.ingredientId,
            data.ingredientName,
            data.quantity,
            data.unit,
            data.type,
            (data.date as Timestamp).toDate(),
            data.performedBy,
            data.costPerUnit,
            data.reason,
            data.batchId,
            data.orderId,
            data.relatedEntityId
        );
    }
}

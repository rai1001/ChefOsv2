import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction } from '@/domain/entities/StockTransaction';

export interface InventoryStatus {
    currentStock: number;
    recentTransactions: StockTransaction[];
}

@injectable()
export class GetInventoryStatusUseCase {
    constructor(
        @inject(TYPES.InventoryRepository) private inventoryRepository: IInventoryRepository
    ) { }

    async execute(ingredientId: string): Promise<InventoryStatus> {
        const [currentStock, recentTransactions] = await Promise.all([
            this.inventoryRepository.getCurrentStockLevel(ingredientId),
            this.inventoryRepository.getTransactionsByIngredient(ingredientId, 5)
        ]);

        return {
            currentStock,
            recentTransactions
        };
    }
}

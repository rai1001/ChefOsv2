import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../../di/types';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction } from '@/domain/entities/StockTransaction';
import { Unit } from '@/domain/types';

@injectable()
export class PerformAuditUseCase {
    constructor(
        @inject(TYPES.InventoryRepository) private inventoryRepository: IInventoryRepository
    ) { }

    async execute(ingredientId: string, measuredQuantity: number, performedBy: string, ingredientName: string, unit: Unit): Promise<void> {
        const currentStock = await this.inventoryRepository.getCurrentStockLevel(ingredientId);
        const diff = measuredQuantity - currentStock;

        if (diff === 0) {
            // Log a "Verified" transaction (quantity 0) to confirm audit took place
            const transaction = new StockTransaction(
                uuidv4(),
                ingredientId,
                ingredientName,
                0,
                unit,
                'AUDIT',
                new Date(),
                performedBy,
                0,
                'Audit Confirmed: Match'
            );
            await this.inventoryRepository.addTransaction(transaction);
            return;
        }

        const transaction = new StockTransaction(
            uuidv4(),
            ingredientId,
            ingredientName,
            diff,
            unit,
            'AUDIT',
            new Date(),
            performedBy,
            0,
            `Audit Adjustment (System: ${currentStock}, Count: ${measuredQuantity})`
        );

        await this.inventoryRepository.addTransaction(transaction);
    }
}

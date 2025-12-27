import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../../di/types';
import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { StockTransaction, StockTransactionType } from '@/domain/entities/StockTransaction';
import { Unit } from '@/domain/types';

export interface RegisterStockMovementDTO {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: Unit;
    type: StockTransactionType;
    performedBy: string;
    costPerUnit?: number;
    reason?: string;
    batchId?: string;
    orderId?: string;
    relatedEntityId?: string;
}

@injectable()
export class RegisterStockMovementUseCase {
    constructor(
        @inject(TYPES.InventoryRepository) private inventoryRepository: IInventoryRepository
    ) { }

    async execute(data: RegisterStockMovementDTO): Promise<void> {
        const transaction = new StockTransaction(
            uuidv4(),
            data.ingredientId,
            data.ingredientName,
            data.quantity,
            data.unit,
            data.type,
            new Date(),
            data.performedBy,
            data.costPerUnit || 0,
            data.reason,
            data.batchId,
            data.orderId,
            data.relatedEntityId
        );

        await this.inventoryRepository.addTransaction(transaction);
    }
}

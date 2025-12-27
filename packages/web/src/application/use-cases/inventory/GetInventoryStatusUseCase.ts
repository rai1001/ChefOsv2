import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { GetInventoryStatusUseCase as CoreGetInventoryStatusUseCase } from '@culinaryos/core';
import { StockTransaction } from '@/domain/entities/StockTransaction';
import { Unit } from '@/domain/types';

export interface InventoryStatus {
  currentStock: number;
  recentTransactions: StockTransaction[];
}

@injectable()
export class GetInventoryStatusUseCase {
  constructor(
    @inject(TYPES.CoreGetInventoryStatusUseCase) private coreUseCase: CoreGetInventoryStatusUseCase
  ) {}

  async execute(ingredientId: string): Promise<InventoryStatus> {
    const status = await this.coreUseCase.execute(ingredientId);

    return {
      currentStock: status.currentStock.value,
      recentTransactions: status.recentTransactions.map(
        (t) =>
          new StockTransaction(
            t.id,
            t.ingredientId,
            t.ingredientName,
            t.quantity.value,
            t.quantity.unit.toString() as Unit,
            this.toLegacyType(t.type),
            t.date,
            t.performedBy,
            t.unitCost.amount,
            t.reason,
            t.referenceId
          )
      ),
    };
  }

  private toLegacyType(type: string): any {
    if (type === 'SALE') return 'USAGE';
    return type;
  }
}

import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {
  ProcessStockMovementUseCase as CoreProcessStockMovementUseCase,
  StockMovementType,
  Quantity,
  Unit as CoreUnit,
  Money,
} from '@culinaryos/core';
import { StockTransactionType } from '@/domain/entities/StockTransaction';
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
    @inject(TYPES.CoreProcessStockMovementUseCase)
    private coreUseCase: CoreProcessStockMovementUseCase
  ) {}

  async execute(data: RegisterStockMovementDTO): Promise<void> {
    // Map legacy StockTransactionType to core StockMovementType
    let coreType: StockMovementType = 'ADJUSTMENT';
    if (data.type === 'PURCHASE') coreType = 'PURCHASE';
    if (data.type === 'WASTE') coreType = 'WASTE';
    if (data.type === 'USAGE') coreType = 'SALE'; // Legacy USAGE maps to core SALE or similar consumption
    // PRODUCTION not currently in legacy type, but core supports it

    await this.coreUseCase.execute({
      ingredientId: data.ingredientId,
      outletId: 'default-outlet', // Need to handle outletId properly
      quantity: new Quantity(data.quantity, new CoreUnit(data.unit as any)),
      type: coreType,
      performedBy: data.performedBy,
      unitCost: data.costPerUnit ? new Money(data.costPerUnit, 'EUR') : undefined,
      reason: data.reason,
      referenceId: data.batchId || data.orderId || data.relatedEntityId,
    });
  }
}

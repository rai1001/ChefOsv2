import { Quantity } from '../../domain/value-objects/Quantity';
import { Money } from '../../domain/value-objects/Money';
import { AdjustStockUseCase } from './AdjustStockUseCase';

export type StockMovementType = 'PURCHASE' | 'WASTE' | 'SALE' | 'ADJUSTMENT' | 'PRODUCTION';

export interface ProcessStockMovementDTO {
  ingredientId: string;
  outletId: string;
  quantity: Quantity;
  type: StockMovementType;
  performedBy: string;
  unitCost?: Money;
  reason?: string;
  referenceId?: string;
}

export class ProcessStockMovementUseCase {
  constructor(private readonly adjustStockUseCase: AdjustStockUseCase) {}

  async execute(dto: ProcessStockMovementDTO): Promise<void> {
    const isIncrease =
      dto.type === 'PURCHASE' ||
      (dto.type === 'ADJUSTMENT' && dto.quantity.value > 0) ||
      dto.type === 'PRODUCTION';
    const absQuantity = new Quantity(Math.abs(dto.quantity.value), dto.quantity.unit);

    await this.adjustStockUseCase.execute({
      ingredientId: dto.ingredientId,
      outletId: dto.outletId,
      adjustment: absQuantity,
      type: isIncrease ? 'increase' : 'decrease',
      reason:
        dto.reason ||
        `${dto.type} by ${dto.performedBy}${dto.referenceId ? ` (Ref: ${dto.referenceId})` : ''}`,
      unitCost: dto.unitCost,
    });
  }
}

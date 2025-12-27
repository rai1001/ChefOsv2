import { Quantity } from '../../domain/value-objects/Quantity';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { AdjustStockUseCase } from './AdjustStockUseCase';

export interface PerformAuditDTO {
  ingredientId: string;
  measuredQuantity: Quantity;
  performedBy: string;
  reason?: string;
}

export class PerformAuditUseCase {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly adjustStockUseCase: AdjustStockUseCase
  ) {}

  async execute(dto: PerformAuditDTO): Promise<void> {
    const ingredient = await this.ingredientRepo.findById(dto.ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient with ID ${dto.ingredientId} not found`);
    }

    const currentStockValue = ingredient.currentStock.value;
    const measuredValue = dto.measuredQuantity.value;
    const diff = measuredValue - currentStockValue;

    if (diff === 0) {
      return; // No adjustment needed, though we could log a verification
    }

    await this.adjustStockUseCase.execute({
      ingredientId: dto.ingredientId,
      outletId: ingredient.outletId,
      adjustment: new Quantity(Math.abs(diff), dto.measuredQuantity.unit),
      type: diff > 0 ? 'increase' : 'decrease',
      reason:
        dto.reason ||
        `Audit adjustment by ${dto.performedBy}. Expected: ${currentStockValue}, Found: ${measuredValue}`,
      unitCost: diff > 0 ? ingredient.averageCost || ingredient.lastCost : undefined,
    });
  }
}

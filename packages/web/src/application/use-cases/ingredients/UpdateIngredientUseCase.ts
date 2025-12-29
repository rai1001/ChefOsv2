import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {
  UpdateIngredientUseCase as CoreUseCase,
  UpdateIngredientDTO,
  Quantity,
  Unit,
  Money,
} from '@culinaryos/core';
import { UpdateIngredientRequest } from '@/types/inventory';

@injectable()
export class UpdateIngredientUseCase {
  constructor(@inject(TYPES.CoreUpdateIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(id: string, request: UpdateIngredientRequest): Promise<void> {
    const dto: UpdateIngredientDTO = {};

    if (request.name !== undefined) dto.name = request.name;
    if (request.category !== undefined) dto.category = request.category;
    if (request.minStock !== undefined && request.unit) {
      dto.minimumStock = new Quantity(request.minStock, new Unit(request.unit as any));
    }
    if (request.stock !== undefined && request.unit) {
      dto.currentStock = new Quantity(request.stock, new Unit(request.unit as any));
    }
    if (request.yieldFactor !== undefined) dto.yieldFactor = request.yieldFactor;
    if (request.pieceWeight !== undefined) dto.pieceWeight = request.pieceWeight;
    if (request.sku !== undefined) dto.sku = request.sku;
    if (request.allergens !== undefined) dto.allergens = request.allergens;
    if (request.isActive !== undefined) dto.isActive = request.isActive;

    if (request.costPerUnit !== undefined) {
      dto.lastCost = Money.fromCents(Math.round(request.costPerUnit * 100));
    }

    // TODO: Handle suppliers update more granularly if needed
    if (request.supplierId !== undefined) {
      // This logic is simplistic (overwrites preferred supplier).
      // Ideal logic would exist in Core to manage supplier list.
      dto.preferredSupplierId = request.supplierId;
    }

    await this.coreUseCase.execute(id, dto);
  }
}

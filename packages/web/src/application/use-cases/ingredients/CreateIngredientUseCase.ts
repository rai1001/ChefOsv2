import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {
  CreateIngredientUseCase as CoreUseCase,
  CreateIngredientDTO,
  Money,
  Unit,
  Quantity,
} from '@culinaryos/core';
import { CreateIngredientRequest } from '@/types/inventory';

@injectable()
export class CreateIngredientUseCase {
  constructor(@inject(TYPES.CoreCreateIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(request: CreateIngredientRequest): Promise<void> {
    const dto: CreateIngredientDTO = {
      outletId: request.outletId,
      name: request.name,
      category: request.category,
      unit: request.unit,
      minimumStock: new Quantity(request.minStock, new Unit(request.unit as any)),
      yieldFactor: request.yieldFactor || 1,
      suppliers: request.supplierId
        ? [
            {
              supplierId: request.supplierId,
              supplierName: 'Unknown',
              price: Money.fromCents(Math.round((request.costPerUnit || 0) * 100)),
              unit: request.unit,
              leadTimeDays: 0,
              qualityRating: 0,
              isPrimary: true,
              isActive: true,
            },
          ]
        : [],
      sku: request.sku,
      allergens: request.allergens || [],
      pieceWeight: request.pieceWeight,
    };

    await this.coreUseCase.execute(dto);
  }
}

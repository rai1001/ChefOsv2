import { Batch } from '../../domain/entities/Batch';
import { Ingredient } from '../../domain/entities/Ingredient';
import { IBatchRepository } from '../../infrastructure/repositories/IBatchRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { Quantity } from '../../domain/value-objects/Quantity';

export interface ExpiryCheckResult {
  ingredient: Ingredient;
  batches: Batch[];
  totalQuantity: Quantity;
}

export class CheckExpiryUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly ingredientRepository: IIngredientRepository
  ) {}

  async execute(outletId: string, daysAhead: number): Promise<ExpiryCheckResult[]> {
    // 1. Obtener lotes por vencer
    const expiringBatches = await this.batchRepository.findExpiringSoon(outletId, daysAhead);

    if (expiringBatches.length === 0) {
      return [];
    }

    // 2. Agrupar por Ingrediente
    const batchesByIngredient = new Map<string, Batch[]>();
    for (const batch of expiringBatches) {
      const list = batchesByIngredient.get(batch.ingredientId) || [];
      list.push(batch);
      batchesByIngredient.set(batch.ingredientId, list);
    }

    // 3. Construir resultados
    const results: ExpiryCheckResult[] = [];

    for (const [ingredientId, batches] of batchesByIngredient.entries()) {
      const ingredient = await this.ingredientRepository.findById(ingredientId);
      if (!ingredient || batches.length === 0) continue; // Should not happen

      const firstBatch = batches[0];
      if (!firstBatch) continue; // Type guard

      let totalQty = new Quantity(0, firstBatch.remainingQuantity.unit);

      // Sumamos cantidades (asumiendo misma unidad, sino habría que convertir)
      // Batch.quantity tiene Unit.
      for (const b of batches) {
        try {
          totalQty = totalQty.add(b.remainingQuantity);
        } catch (e) {
          // Si hay mezclas de unidades incompatibles, log error o ignorar?
          // Asumimos consistencia por ingrediente.
        }
      }

      results.push({
        ingredient,
        batches,
        totalQuantity: totalQty,
      });
    }

    return results;
  }
}

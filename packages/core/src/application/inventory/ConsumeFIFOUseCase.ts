import { ConsumeBatchDTO } from '../../domain/entities/Batch';
import { IBatchRepository } from '../../infrastructure/repositories/IBatchRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { IStockTransactionRepository } from '../../infrastructure/repositories/IStockTransactionRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';
import { Quantity } from '../../domain/value-objects/Quantity';

export interface ConsumeFIFODTO {
  ingredientId: string;
  quantity: Quantity;
  reason: string;
  reference?: string;
}

export interface ConsumedBatchResult {
  batchId: string;
  consumedQuantity: Quantity;
  remainingQuantity: Quantity;
  cost: number; // Cost of the consumed part
}

export class ConsumeFIFOUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly ingredientRepository: IIngredientRepository,
    private readonly transactionRepository: IStockTransactionRepository,
    private readonly transactionManager: ITransactionManager
  ) {}

  async execute(dto: ConsumeFIFODTO): Promise<ConsumedBatchResult[]> {
    return this.transactionManager.runTransaction(async (transaction) => {
      // 0. Guard clause
      if (dto.quantity.value <= 0) {
        return [];
      }

      // 1. Validar Ingredient y Stock Total
      const ingredient = await this.ingredientRepository.findById(dto.ingredientId, {
        transaction,
      });
      if (!ingredient) {
        throw new Error(`Ingredient with ID ${dto.ingredientId} not found`);
      }

      if (ingredient.currentStock.isLessThan(dto.quantity)) {
        throw new Error(
          `Insufficient stock. Requested: ${dto.quantity.toString()}, Available: ${ingredient.currentStock.toString()}`
        );
      }

      // 2. Obtener lotes activos FIFO
      // Nota: findActiveBatchesFIFO podría necesitar transaction también si la implementación lo soporta
      const batches = await this.batchRepository.findActiveBatchesFIFO(dto.ingredientId);

      let remainingToConsume = dto.quantity;
      const results: ConsumedBatchResult[] = [];

      for (const batch of batches) {
        if (remainingToConsume.value <= 0) break;

        // Determinar cuánto consumir de este lote
        const canConsumeFromBatch =
          batch.remainingQuantity.value >= remainingToConsume.value
            ? remainingToConsume
            : batch.remainingQuantity;

        // Consumir del lote
        const consumeBatchDTO: ConsumeBatchDTO = {
          batchId: batch.id,
          quantity: canConsumeFromBatch,
          reason: dto.reason,
          reference: dto.reference,
        };

        const updatedBatch = await this.batchRepository.consume(consumeBatchDTO, { transaction });

        results.push({
          batchId: batch.id,
          consumedQuantity: canConsumeFromBatch,
          remainingQuantity: updatedBatch.remainingQuantity,
          cost: batch.unitCost.multiply(canConsumeFromBatch.value).amount,
        });

        remainingToConsume = remainingToConsume.subtract(canConsumeFromBatch);
      }

      if (remainingToConsume.value > 0.0001) {
        // Floating point tolerance
        throw new Error(
          'Data integrity mismatch: Ingredient stock says available but Batches sum is insufficient.'
        );
      }

      // 3. Actualizar Stock del Ingrediente
      const newStock = ingredient.currentStock.subtract(dto.quantity);
      await this.ingredientRepository.update(
        ingredient.id,
        {
          currentStock: newStock,
        },
        { transaction }
      );

      // 4. Registrar la transacción
      await this.transactionRepository.create(
        {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          quantity: dto.quantity.multiply(-1), // Negative for consumption
          unitCost:
            ingredient.averageCost ||
            ingredient.lastCost ||
            (await import('../../domain/value-objects/Money')).Money.fromCents(0, 'EUR'), // Use last known cost
          type: 'SALE', // Map reason to type properly in future
          performedBy: 'System',
          reason: dto.reason,
          referenceId: dto.reference,
        },
        { transaction }
      );

      return results;
    });
  }
}

import { Batch, CreateBatchDTO } from '../../domain/entities/Batch';
import { IBatchRepository } from '../../domain/interfaces/repositories/IBatchRepository';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { ITransactionManager } from '../../domain/interfaces/ITransactionManager';

export class AddBatchUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly ingredientRepository: IIngredientRepository,
    private readonly transactionManager: ITransactionManager
  ) {}

  async execute(dto: CreateBatchDTO): Promise<Batch> {
    return this.transactionManager.runTransaction(async (transaction) => {
      // 1. Validar que el ingrediente existe
      const ingredient = await this.ingredientRepository.findById(dto.ingredientId, {
        transaction,
      });
      if (!ingredient) {
        throw new Error(`Ingredient with ID ${dto.ingredientId} not found`);
      }

      // 2. Crear el lote (Batch)
      // La creación retornará el Batch con status ACTIVE y calculos iniciales
      const newBatch = await this.batchRepository.create(dto, { transaction });

      // 3. Actualizar el stock del ingrediente
      const newStock = ingredient.currentStock.add(dto.quantity);

      // 4. Actualizar el último costo
      await this.ingredientRepository.update(
        ingredient.id,
        {
          currentStock: newStock,
          lastCost: dto.unitCost,
        },
        { transaction }
      );

      return newBatch;
    });
  }
}

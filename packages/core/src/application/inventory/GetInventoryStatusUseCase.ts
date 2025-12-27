import { Quantity } from '../../domain/value-objects/Quantity';
import { StockTransaction } from '../../domain/entities/StockTransaction';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { IStockTransactionRepository } from '../../infrastructure/repositories/IStockTransactionRepository';

export interface InventoryStatus {
  currentStock: Quantity;
  recentTransactions: StockTransaction[];
}

export class GetInventoryStatusUseCase {
  constructor(
    private readonly ingredientRepository: IIngredientRepository,
    private readonly transactionRepository: IStockTransactionRepository
  ) {}

  async execute(ingredientId: string): Promise<InventoryStatus> {
    const ingredient = await this.ingredientRepository.findById(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient with ID ${ingredientId} not found`);
    }

    const recentTransactions = await this.transactionRepository.findByIngredientId(
      ingredientId,
      10 // Default limit for recent transactions
    );

    return {
      currentStock: ingredient.currentStock,
      recentTransactions,
    };
  }
}

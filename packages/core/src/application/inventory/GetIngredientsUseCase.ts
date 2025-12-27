import { Ingredient } from '../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';

export class GetIngredientsUseCase {
  constructor(private repository: IIngredientRepository) {}

  async execute(outletId: string): Promise<Ingredient[]> {
    if (!outletId) {
      throw new Error('Outlet ID is required');
    }
    return this.repository.findByOutletId(outletId);
  }
}

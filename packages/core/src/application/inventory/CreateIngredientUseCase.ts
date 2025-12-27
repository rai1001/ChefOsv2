import { Ingredient, CreateIngredientDTO } from '../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';

export class CreateIngredientUseCase {
  constructor(private repository: IIngredientRepository) {}

  async execute(dto: CreateIngredientDTO): Promise<Ingredient> {
    if (!dto.name) {
      throw new Error('Ingredient name is required');
    }
    if (!dto.outletId) {
      throw new Error('Outlet ID is required');
    }
    return this.repository.create(dto);
  }
}

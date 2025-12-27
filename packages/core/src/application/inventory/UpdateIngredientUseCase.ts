import { Ingredient, UpdateIngredientDTO } from '../../domain/entities/Ingredient';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';

export class UpdateIngredientUseCase {
  constructor(private repository: IIngredientRepository) {}

  async execute(id: string, dto: UpdateIngredientDTO): Promise<Ingredient> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Ingredient with ID ${id} not found`);
    }
    return this.repository.update(id, dto);
  }
}

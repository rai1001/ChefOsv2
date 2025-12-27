import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';

export class DeleteIngredientUseCase {
  constructor(private repository: IIngredientRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Ingredient with ID ${id} not found`);
    }
    return this.repository.delete(id);
  }
}

import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export interface IngredientUsageHistory {
  fichaId: string;
  fichaName: string;
  versionNumber: number;
  quantity: number;
  unit: string;
  date: Date;
}

export class GetIngredientUsageHistoryUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(ingredientId: string, outletId: string): Promise<IngredientUsageHistory[]> {
    // This requires a specific query. Since generic repositories might not cover this "cross-cutting" concern efficiently
    // without a specific method, we might need 'findAllVersions' or 'findByIngredient'.
    // For now, let's assume we can get all fichas or have a specific method.
    // Ideally, the repository should expose `findVersionsByIngredient`.

    // Check if the repository has a method for this, otherwise we might need to iterate (inefficient) or request a new repo method.
    // Let's rely on adding `findVersionsByIngredient` to the repository interface.

    const versions = await this.repository.findVersionsByIngredient(ingredientId, outletId);

    return versions.map((v) => {
      const ingredient = v.snapshot.ingredients.find((i) => i.ingredientId === ingredientId);
      return {
        fichaId: v.fichaId,
        fichaName: v.snapshot.name,
        versionNumber: v.versionNumber,
        quantity: ingredient?.quantity.value || 0,
        unit: String(ingredient?.quantity.unit || ''),
        date: v.createdAt,
      };
    });
  }
}

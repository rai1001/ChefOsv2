import { FichaTecnica } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { Money } from '../../domain/value-objects/Money';

export class CalculateFichaCostUseCase {
  constructor(
    private readonly ficheRepo: IFichaTecnicaRepository,
    private readonly ingredientRepo: IIngredientRepository
  ) {}

  async execute(fichaId: string, depth = 0): Promise<FichaTecnica | null> {
    if (depth > 5) {
      return null; // Prevent infinite recursion
    }

    const ficha = await this.ficheRepo.findById(fichaId);
    if (!ficha) return null;

    let totalIngredientsCostCents = 0;

    for (const item of ficha.ingredients) {
      let unitCostCents = 0;

      if (item.type === 'raw') {
        const ingredient = await this.ingredientRepo.findById(item.ingredientId);
        if (ingredient) {
          // Use average cost if available, otherwise last cost
          unitCostCents =
            ingredient.averageCost?.centsValue || ingredient.lastCost?.centsValue || 0;
        }
      } else if (item.type === 'recipe') {
        const subFicha = await this.execute(item.ingredientId, depth + 1);
        if (subFicha && subFicha.costPerPortion) {
          unitCostCents = subFicha.costPerPortion.centsValue;
        }
      }

      const itemQuantity = item.quantity.value;
      const wasteFactor = 1 + (item.wastePercentage || 0);
      const itemTotalCostCents = Math.round(itemQuantity * unitCostCents * wasteFactor);

      item.unitCost = Money.fromCents(unitCostCents);
      item.totalCost = Money.fromCents(itemTotalCostCents);

      totalIngredientsCostCents += itemTotalCostCents;
    }

    const laborCostCents = ficha.laborCost?.centsValue || 0;
    const packagingCostCents = ficha.packagingCost?.centsValue || 0;
    const totalProductionCostCents =
      totalIngredientsCostCents + laborCostCents + packagingCostCents;

    ficha.totalCost = Money.fromCents(totalProductionCostCents);

    const yieldValue = ficha.yield.value;
    if (yieldValue > 0) {
      ficha.costPerPortion = Money.fromCents(Math.round(totalProductionCostCents / yieldValue));
    } else {
      ficha.costPerPortion = Money.fromCents(0);
    }

    if (ficha.sellingPrice && ficha.sellingPrice.centsValue > 0) {
      ficha.actualCostPercent =
        (ficha.costPerPortion.centsValue / ficha.sellingPrice.centsValue) * 100;
      ficha.grossMargin = Money.fromCents(
        ficha.sellingPrice.centsValue - ficha.costPerPortion.centsValue
      );
    }

    ficha.updatedAt = new Date();

    // Update the ficha with the new calculated values
    await this.ficheRepo.update(ficha.id, {
      ...ficha,
      ingredients: ficha.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        type: i.type,
        quantity: i.quantity,
        wastePercentage: i.wastePercentage,
      })),
    } as any);

    return ficha;
  }
}

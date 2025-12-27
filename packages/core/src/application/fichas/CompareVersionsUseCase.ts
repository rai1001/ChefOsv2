import { Money } from '../../domain/value-objects/Money';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export interface IngredientChange {
  ingredientId: string;
  ingredientName: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  oldQuantity?: string;
  newQuantity?: string;
  costDiff?: Money;
}

export interface VersionComparisonResult {
  fichaId: string;
  versionA: number;
  versionB: number;
  totalCostDiff: Money; // B - A
  prepTimeDiff: number; // minutes
  cookTimeDiff: number; // minutes
  ingredientChanges: IngredientChange[];
}

export class CompareVersionsUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(
    fichaId: string,
    versionNumberA: number,
    versionNumberB: number
  ): Promise<VersionComparisonResult> {
    const [versionA, versionB] = await Promise.all([
      this.repository.getVersion(fichaId, versionNumberA),
      this.repository.getVersion(fichaId, versionNumberB),
    ]);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    const fichaA = versionA.snapshot;
    const fichaB = versionB.snapshot;

    // Calculate Cost Diff (B - A)
    // If costs are undefined, assume 0 for diff calculation context or handle as null
    // Money handles negative amounts in constructor check? No, constructor throws if negative.
    // But subtract can return negative?
    // Money.subtract returns from Cents subtraction.
    // Wait, Money constructor prohibits negative amount.
    // So Money cannot represent negative values?
    // Let's check Money.ts line 10: if (amount < 0) throw error.
    // Money.subtract line 40: Money.fromCents(this.cents - other.cents, ...)
    // fromCents is static factory, line 18. It creates object and sets cents directly.
    // It bypasses constructor validation?
    // line 20: money.cents = cents.
    // Yes, so Money CAN be negative if created via fromCents or logic inside subtract.
    // Let's check comparison result.

    const costA = fichaA.totalCost || new Money(0, 'EUR');
    const costB = fichaB.totalCost || new Money(0, 'EUR');
    const totalCostDiff = costB.subtract(costA);

    const prepTimeDiff = (fichaB.prepTime || 0) - (fichaA.prepTime || 0);
    const cookTimeDiff = (fichaB.cookTime || 0) - (fichaA.cookTime || 0);

    // Ingredient Changes
    const ingredientsA = new Map(fichaA.ingredients.map((i) => [i.ingredientId, i]));
    const ingredientsB = new Map(fichaB.ingredients.map((i) => [i.ingredientId, i]));
    const allIngredientIds = new Set([...ingredientsA.keys(), ...ingredientsB.keys()]);

    const ingredientChanges: IngredientChange[] = [];

    for (const id of allIngredientIds) {
      const ingA = ingredientsA.get(id);
      const ingB = ingredientsB.get(id);

      if (!ingA && ingB) {
        // Added
        ingredientChanges.push({
          ingredientId: id,
          ingredientName: ingB.ingredientName,
          type: 'ADDED',
          newQuantity: ingB.quantity.toString(),
          costDiff: ingB.totalCost || new Money(0, 'EUR'),
        });
      } else if (ingA && !ingB) {
        // Removed
        ingredientChanges.push({
          ingredientId: id,
          ingredientName: ingA.ingredientName,
          type: 'REMOVED',
          oldQuantity: ingA.quantity.toString(),
          // Cost diff is negative of A's cost (0 - A)
          // We need a zero money to subtract from
          costDiff: new Money(0, 'EUR').subtract(ingA.totalCost || new Money(0, 'EUR')),
        });
      } else if (ingA && ingB) {
        // Modified or Unchanged
        // Check quantity or cost equality
        // Assuming Quantity struct has equals?
        // Or just simple value check. Let's assume toString check for quantity representation or value comparison if Units same.
        // Checking deep equality might be hard. Let's assume unmodified if quantity values and units are same.

        const qtyChanged =
          ingA.quantity.value !== ingB.quantity.value ||
          ingA.quantity.unit.toString() !== ingB.quantity.unit.toString();
        // A better check would be domain specific, but value/unit string is okay.

        if (qtyChanged) {
          const costDiff = (ingB.totalCost || new Money(0, 'EUR')).subtract(
            ingA.totalCost || new Money(0, 'EUR')
          );
          ingredientChanges.push({
            ingredientId: id,
            ingredientName: ingB.ingredientName,
            type: 'MODIFIED',
            oldQuantity: ingA.quantity.toString(),
            newQuantity: ingB.quantity.toString(),
            costDiff,
          });
        } else {
          // Could still be modified if unit cost changed?
          // Let's assume for now we care about Quantity changes in Ficha.
          // If unit cost changes in master data, it might reflect here if snapshot updated?
          // Snapshots are static. So if version B has updated costs, it appears here.
          const costDiff = (ingB.totalCost || new Money(0, 'EUR')).subtract(
            ingA.totalCost || new Money(0, 'EUR')
          );
          if (costDiff.amount !== 0) {
            ingredientChanges.push({
              ingredientId: id,
              ingredientName: ingB.ingredientName,
              type: 'MODIFIED', // Cost only modified
              oldQuantity: ingA.quantity.toString(),
              newQuantity: ingB.quantity.toString(),
              costDiff,
            });
          } else {
            ingredientChanges.push({
              ingredientId: id,
              ingredientName: ingB.ingredientName,
              type: 'UNCHANGED',
              oldQuantity: ingA.quantity.toString(),
              newQuantity: ingB.quantity.toString(),
              costDiff: new Money(0, 'EUR'),
            });
          }
        }
      }
    }

    return {
      fichaId,
      versionA: versionNumberA,
      versionB: versionNumberB,
      totalCostDiff,
      prepTimeDiff,
      cookTimeDiff,
      ingredientChanges,
    };
  }
}

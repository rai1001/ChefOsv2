import { describe, it, expect } from 'vitest';
import { FichaTecnica, RecipeIngredient } from './FichaTecnica';
import { Money } from '../value-objects/Money';
import { Quantity } from '../value-objects/Quantity';
import { Unit } from '../value-objects/Unit';

describe('FichaTecnica Entity', () => {
  it('should be able to create a valid FichaTecnica object', () => {
    const ingredient: RecipeIngredient = {
      ingredientId: 'ing-1',
      type: 'raw',
      ingredientName: 'Tomato',
      quantity: new Quantity(0.5, new Unit('kg' as any)),
      unitCost: Money.fromCents(100),
      totalCost: Money.fromCents(50),
      wastePercentage: 0.1,
    };

    const ficha: FichaTecnica = {
      id: 'ficha-1',
      outletId: 'out-1',
      name: 'Tomato Sauce',
      category: 'Base',
      yield: new Quantity(1, new Unit('kg' as any)),
      ingredients: [ingredient],
      totalCost: Money.fromCents(50),
      costPerPortion: Money.fromCents(50),
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(ficha.id).toBe('ficha-1');
    expect(ficha.ingredients).toHaveLength(1);
    expect(ficha.ingredients[0].ingredientId).toBe('ing-1');
    expect(ficha.totalCost?.centsValue).toBe(50);
  });

  it('should support sub-recipe ingredients', () => {
    const subRecipe: RecipeIngredient = {
      ingredientId: 'ficha-sub',
      type: 'recipe',
      ingredientName: 'Base Sauce',
      quantity: new Quantity(1, new Unit('portion' as any)),
    };

    const ficha: Partial<FichaTecnica> = {
      ingredients: [subRecipe],
    };

    expect(ficha.ingredients?.[0].type).toBe('recipe');
  });
});

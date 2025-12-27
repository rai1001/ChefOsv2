import { describe, it, expect, vi } from 'vitest';
import { necesidadesService } from './necesidadesService';
import { Ingredient } from '@/types/inventory';
import { Recipe } from '@/types';

// Mock inventoryService to avoid dependency on its implementation
vi.mock('./inventoryService', () => ({
    calculateTotalStock: vi.fn((batches) => {
        if (!batches) return 0;
        return batches.reduce((sum: number, b: any) => sum + b.currentQuantity, 0);
    })
}));

describe('necesidadesService', () => {

    describe('calculateReorderNeeds', () => {
        it('should identify ingredients below reorder point', () => {
            const ingredients: Ingredient[] = [
                {
                    id: '1',
                    name: 'Tomatoes',
                    stock: 5, // Legacy stock
                    reorderPoint: 10,
                    optimalStock: 20,
                    unit: 'kg',
                    costPerUnit: 2,
                    batches: [] // Should fallback to stock field
                } as any
            ];

            const needs = necesidadesService.calculateReorderNeeds(ingredients);

            expect(needs).toHaveLength(1);
            expect(needs[0].ingredientId).toBe('1');
            expect(needs[0].orderQuantity).toBe(15); // 20 (optimal) - 5 (current)
        });

        it('should calculate stock from batches if available', () => {
            const ingredients: Ingredient[] = [
                {
                    id: '1',
                    name: 'Flour',
                    reorderPoint: 10,
                    optimalStock: 50,
                    unit: 'kg',
                    batches: [
                        { currentQuantity: 5 },
                        { currentQuantity: 2 }
                    ] // Total = 7
                } as any
            ];

            const needs = necesidadesService.calculateReorderNeeds(ingredients);

            expect(needs).toHaveLength(1);
            expect(needs[0].currentStock).toBe(7);
            expect(needs[0].orderQuantity).toBe(43); // 50 - 7
        });

        it('should not suggest ordering if stock is sufficient', () => {
             const ingredients: Ingredient[] = [
                {
                    id: '1',
                    name: 'Salt',
                    stock: 100,
                    reorderPoint: 20,
                    optimalStock: 200,
                    batches: []
                } as any
            ];

            const needs = necesidadesService.calculateReorderNeeds(ingredients);
            expect(needs).toHaveLength(0);
        });

        it('should select supplier based on strategy (CHEAPEST vs FASTEST)', () => {
            const ingredients: Ingredient[] = [
                {
                    id: '1',
                    name: 'Oil',
                    stock: 0,
                    reorderPoint: 10,
                    optimalStock: 20,
                    supplierInfo: [
                        { supplierId: 's1', costPerUnit: 10, leadTimeDays: 5 },
                        { supplierId: 's2', costPerUnit: 12, leadTimeDays: 1 } // Faster but expensive
                    ]
                } as any
            ];

            // Default: Cheapest
            const needsCheap = necesidadesService.calculateReorderNeeds(ingredients, { supplierSelectionStrategy: 'CHEAPEST' });
            expect(needsCheap[0].supplierId).toBe('s1');
            expect(needsCheap[0].costPerUnit).toBe(10);

            // Fastest
            const needsFast = necesidadesService.calculateReorderNeeds(ingredients, { supplierSelectionStrategy: 'FASTEST' });
            expect(needsFast[0].supplierId).toBe('s2');
            expect(needsFast[0].costPerUnit).toBe(12);
        });
    });

    describe('aggregateProductionRequirements', () => {
        it('should sum up ingredients from multiple plans', () => {
            const recipeA: Recipe = {
                id: 'r1',
                yieldPax: 10,
                ingredients: [
                    { ingredientId: 'ing1', quantity: 1, unit: 'kg' }, // 0.1 per pax
                ]
            } as any;

            const recipeB: Recipe = {
                id: 'r2',
                yieldPax: 1,
                ingredients: [
                    { ingredientId: 'ing1', quantity: 0.5, unit: 'kg' } // 0.5 per pax
                ]
            } as any;

            const plans = [
                { recipe: recipeA, targetPax: 20 }, // Needs 2kg (1 * 20/10)
                { recipe: recipeB, targetPax: 10 }  // Needs 5kg (0.5 * 10/1)
            ];

            const totals = necesidadesService.aggregateProductionRequirements(plans);

            expect(totals.get('ing1')).toBe(7);
        });
    });

    describe('checkProductionAvailability', () => {
        it('should return missing ingredients', () => {
            const requirements = new Map<string, number>();
            requirements.set('ing1', 10); // Need 10

            // Ensure batches is an array so calculateTotalStock is called
            const ingredients: Ingredient[] = [
                {
                    id: 'ing1',
                    name: 'Milk',
                    batches: [
                         { currentQuantity: 4 }
                    ]
                } as any
            ];

            const missing = necesidadesService.checkProductionAvailability(requirements, ingredients);

            expect(missing).toHaveLength(1);
            expect(missing[0].ingredientId).toBe('ing1');
            expect(missing[0].missingQuantity).toBe(6); // 10 - 4
        });

        it('should return empty list if all ingredients are sufficient', () => {
            const requirements = new Map<string, number>();
            requirements.set('ing1', 5);

            const ingredients: Ingredient[] = [
                {
                    id: 'ing1',
                    name: 'Milk',
                    batches: [
                        { currentQuantity: 10 }
                    ]
                } as any
            ];

            const missing = necesidadesService.checkProductionAvailability(requirements, ingredients);

            expect(missing).toHaveLength(0);
        });
    });
});

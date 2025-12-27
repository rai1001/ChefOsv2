
import { describe, it, expect } from 'vitest';
import { convertUnit } from './unitConverter';
import { Ingredient } from '@/types/inventory';

describe('Unit Converter Engine', () => {

    // 1. Standard Conversions (No Ingredient Data Needed)
    describe('Standard Mass/Volume Conversions', () => {
        it('converts kg to g', () => {
            expect(convertUnit(1, 'kg', 'g')).toBe(1000);
        });

        it('converts ml to L', () => {
            expect(convertUnit(1000, 'ml', 'L')).toBe(1);
        });

        it('converts g to kg', () => {
            expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
        });
    });

    // 2. Density-based Conversions (Mass <-> Volume)
    describe('Density Conversions (Mass <-> Volume)', () => {
        const oilIngredient: Partial<Ingredient> = {
            id: '1', name: 'Olive Oil', unit: 'L', costPerUnit: 10, yield: 1, allergens: [],
            density: 0.92 // 1ml = 0.92g
        };

        it('converts 100ml oil to g using density', () => {
            // 100ml * 0.92 g/ml = 92g
            const result = convertUnit(100, 'ml', 'g', oilIngredient as Ingredient);
            expect(result).toBeCloseTo(92);
        });

        it('converts 92g oil to ml using density', () => {
            // 92g / 0.92 g/ml = 100ml
            const result = convertUnit(92, 'g', 'ml', oilIngredient as Ingredient);
            expect(result).toBeCloseTo(100);
        });

        it('uses default density for category if specific density is missing', () => {
            const milkIngredient: Partial<Ingredient> = {
                id: '2', name: 'Milk', unit: 'L', costPerUnit: 1, yield: 1, allergens: [],
                category: 'dairy' // Default density 1.03
            };
            // 1000ml * 1.03 = 1030g
            const result = convertUnit(1000, 'ml', 'g', milkIngredient as Ingredient);
            expect(result).toBeCloseTo(1030);
        });
    });

    // 3. Unit-based Conversions (Unit <-> Mass)
    describe('Unit Conversions (Unit <-> Mass)', () => {
        const eggIngredient: Partial<Ingredient> = {
            id: '3', name: 'Egg', unit: 'ud', costPerUnit: 0.5, yield: 1, allergens: [],
            avgUnitWeight: 60 // 1 egg = 60g
        };

        it('converts 2 eggs to grams', () => {
            const result = convertUnit(2, 'ud', 'g', eggIngredient as Ingredient);
            expect(result).toBe(120);
        });

        it('converts 120g eggs to units', () => {
            const result = convertUnit(120, 'g', 'ud', eggIngredient as Ingredient);
            expect(result).toBe(2);
        });

        it('throws error if avgUnitWeight is missing', () => {
            const unknownItem: Partial<Ingredient> = {
                 id: '4', name: 'Unknown', unit: 'ud', costPerUnit: 1, yield: 1, allergens: []
            };
            expect(() => convertUnit(1, 'ud', 'g', unknownItem as Ingredient)).toThrow();
        });
    });

    // 4. Complex Chain (Unit <-> Volume)
    describe('Complex Conversions (Unit <-> Volume)', () => {
        const lemonIngredient: Partial<Ingredient> = {
            id: '5', name: 'Lemon', unit: 'ud', costPerUnit: 0.2, yield: 1, allergens: [],
            avgUnitWeight: 100, // 100g per lemon
            density: 1.0 // Assume juice density approx water
        };

        it('converts 1 lemon to ml (assuming 100g ~ 100ml)', () => {
            const result = convertUnit(1, 'ud', 'ml', lemonIngredient as Ingredient);
            expect(result).toBeCloseTo(100);
        });
    });
});

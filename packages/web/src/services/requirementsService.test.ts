
import { describe, it, expect } from 'vitest';
import { RequirementsService } from './requirementsService';
import { Event, Menu, Recipe, Ingredient } from '@/types';

describe('RequirementsService (Vaca Brain)', () => {
    const mockIngredients: Record<string, Ingredient> = {
        'ing-onion': {
            id: 'ing-onion', name: 'Onion', unit: 'kg', costPerUnit: 2, yield: 1,
            wastageFactor: 0.2, // 20% waste
            allergens: []
        },
        'ing-beef': {
            id: 'ing-beef', name: 'Beef', unit: 'kg', costPerUnit: 10, yield: 1,
            wastageFactor: 0,
            allergens: []
        },
        'ing-salt': {
            id: 'ing-salt', name: 'Salt', unit: 'kg', costPerUnit: 0.5, yield: 1,
            wastageFactor: 0,
            allergens: []
        }
    };

    const mockRecipes: Record<string, Recipe> = {
        'rec-burger': {
            id: 'rec-burger', name: 'Burger', station: 'hot',
            yieldPax: 1, // 1 portion
            ingredients: [
                { ingredientId: 'ing-beef', quantity: 0.150 }, // 150g beef
                { ingredientId: 'rec-sauce', quantity: 0.050 } // 50g sauce (Base Recipe)
            ]
        },
        'rec-sauce': {
            id: 'rec-sauce', name: 'Special Sauce', station: 'cold',
            isBase: true,
            yieldPax: 1, // Let's say this recipe makes 1kg of sauce?
            // Or usually base recipes have yield.
            // If yieldPax is 1, and unit is kg...
            // Let's assume yieldPax represents "portions" or "units" compatible with parent.
            // Simplified: yieldPax=1 means quantities produce 1 unit of this recipe.
            ingredients: [
                { ingredientId: 'ing-onion', quantity: 0.5 }, // 0.5kg onion
                { ingredientId: 'ing-salt', quantity: 0.01 }
            ]
        }
    };

    const mockMenus: Record<string, Menu> = {
        'menu-1': {
            id: 'menu-1', name: 'Burger Menu', recipeIds: ['rec-burger'], outletId: 'out-1'
        }
    };

    const mockEvents: Event[] = [
        {
            id: 'evt-1', name: 'Lunch Rush', date: '2023-12-25', pax: 10,
            type: 'Mediodia', menuId: 'menu-1'
        }
    ];

    it('calculates gross requirements with recursion and wastage', () => {
        const requirements = RequirementsService.calculateRequirements(mockEvents, {
            ingredients: mockIngredients,
            recipes: mockRecipes,
            menus: mockMenus
        });

        // Expected Calculations:
        // Event Pax: 10

        // 1. Burger (Yield 1) -> Multiplier 10/1 = 10
        //    - Beef: 0.150 * 10 = 1.5 kg. Wastage 0 -> 1.5 kg Gross.
        //    - Sauce (Base): 0.050 * 10 = 0.5 kg needed.

        // 2. Sauce (Base Recipe) Explosion
        //    - Parent needed 0.5 kg.
        //    - Sauce Recipe Yield is 1. So multiplier for Sauce ingredients is 0.5 / 1 = 0.5.
        //    - Onion: 0.5 (qty) * 0.5 (mult) = 0.25 kg Net.
        //      Wastage 20% -> Gross = 0.25 / (1 - 0.2) = 0.25 / 0.8 = 0.3125 kg.
        //    - Salt: 0.01 * 0.5 = 0.005 kg Net. Wastage 0 -> 0.005 kg.

        const beefReq = requirements.find(r => r.ingredientId === 'ing-beef');
        expect(beefReq?.totalGrossQuantity).toBeCloseTo(1.5);

        const onionReq = requirements.find(r => r.ingredientId === 'ing-onion');
        expect(onionReq?.totalGrossQuantity).toBeCloseTo(0.3125);
    });
});

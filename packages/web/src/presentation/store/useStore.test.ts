import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { Ingredient, Event } from '@/types';

describe('useStore', () => {
    // Reset store before each test to ensure isolation
    beforeEach(() => {
        useStore.setState({
            ingredients: [],
            events: [],
            recipes: [],
            menus: [],
            staff: [],
            schedule: {},
            suppliers: [],
            purchaseOrders: [],
            wasteRecords: []
        });
    });

    describe('Ingredients & Stock', () => {
        it('should add an ingredient', () => {
            const newIngredient: Ingredient = {
                id: '1',
                name: 'Tomate',
                unit: 'kg',
                costPerUnit: 1.5,
                stock: 0,
                minStock: 5,
                yield: 1,
                allergens: []
            };

            useStore.getState().addIngredient(newIngredient);

            const ingredients = useStore.getState().ingredients;
            expect(ingredients).toHaveLength(1);
            expect(ingredients[0]).toEqual(newIngredient);
        });

        it('should add a batch and update total stock', () => {
            const ingredient: Ingredient = {
                id: '1',
                name: 'Tomate',
                unit: 'kg',
                costPerUnit: 1.5,
                stock: 0,
                minStock: 5,
                yield: 1,
                allergens: []
            };
            useStore.getState().addIngredient(ingredient);

            const batch = {
                quantity: 10,
                expiryDate: new Date().toISOString(),
                receivedDate: new Date().toISOString(),
                costPerUnit: 1.5
            };

            useStore.getState().addBatch('1', batch);

            const updatedIngredient = useStore.getState().ingredients[0];
            expect(updatedIngredient.stock).toBe(10);
            expect(updatedIngredient.batches).toHaveLength(1);
        });
    });

    describe('Events', () => {
        it('should add an event', () => {
            const event: Event = {
                id: 'evt-1',
                name: 'Boda Test',
                date: '2025-06-15',
                pax: 100,
                type: 'Boda'
            };

            useStore.getState().addEvent(event);

            const events = useStore.getState().events;
            expect(events).toHaveLength(1);
            expect(events[0]).toEqual(event);
        });

        it('should update an event', () => {
            const event: Event = {
                id: 'evt-1',
                name: 'Boda Test',
                date: '2025-06-15',
                pax: 100,
                type: 'Boda'
            };
            useStore.getState().addEvent(event);

            useStore.getState().updateEvent({ ...event, pax: 120 });

            const updatedEvent = useStore.getState().events[0];
            expect(updatedEvent.pax).toBe(120);
        });
    });
});

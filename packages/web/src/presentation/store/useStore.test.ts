import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { Ingredient, Event } from '@/types';

// Mock firestoreService to prevent actual network calls/timeouts
vi.mock('@/services/firestoreService', () => ({
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
  getCollection: vi.fn(() => Promise.resolve([])),
}));

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
      wasteRecords: [],
    });
  });

  describe('Inventory & Stock', () => {
    it('should add an inventory item', () => {
      const newItem: any = {
        id: 'inv-1',
        name: 'Tomate',
        unit: 'kg',
        costPerUnit: 1.5,
        stock: 0,
        minStock: 5,
        ingredientId: 'ing-1',
        outletId: 'outlet-1',
      };

      useStore.getState().addInventoryItem(newItem);

      const inventory = useStore.getState().inventory;
      expect(inventory).toHaveLength(1);
      expect(inventory[0]).toEqual(newItem);
    });

    it('should add a batch and update total stock in inventory', async () => {
      const item: any = {
        id: 'inv-1',
        name: 'Tomate',
        unit: 'kg',
        costPerUnit: 1.5,
        stock: 0,
        batches: [],
        ingredientId: 'ing-1',
        outletId: 'outlet-1', // Active outlet mock
      };

      // Set active outlet to match item
      useStore.setState({ activeOutletId: 'outlet-1' });
      useStore.getState().addInventoryItem(item);

      const batch = {
        currentQuantity: 10,
        initialQuantity: 10,
        expiresAt: new Date().toISOString(),
        costPerUnit: 1.5,
      };

      await useStore.getState().addBatch('inv-1', batch);

      const updatedItem = useStore.getState().inventory[0];
      expect(updatedItem.stock).toBe(10);
      expect(updatedItem.batches).toHaveLength(1);
    });
  });

  describe('Events', () => {
    it('should add an event', () => {
      const event: Event = {
        id: 'evt-1',
        name: 'Boda Test',
        date: '2025-06-15',
        pax: 100,
        type: 'Boda',
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
        type: 'Boda',
      };
      useStore.getState().addEvent(event);

      useStore.getState().updateEvent({ ...event, pax: 120 });

      const updatedEvent = useStore.getState().events[0];
      expect(updatedEvent.pax).toBe(120);
    });
  });
});

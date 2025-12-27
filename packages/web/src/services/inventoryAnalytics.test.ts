import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inventoryAnalyticsService } from './inventoryAnalytics';
import { COLLECTIONS } from '@/config/collections';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

describe('inventoryAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInventoryContext', () => {
    it('should aggregate historical and future demand correctly', async () => {
      const { getDocs } = await import('firebase/firestore');

      const mockIngredients = [{ id: 'ing-1', name: 'Tomato', unit: 'kg', outletId: 'o1' }];
      const mockRecipes = [
        {
          id: 'rec-1',
          name: 'Tomato Sauce',
          ingredients: [{ ingredientId: 'ing-1', quantity: 0.5 }], // 0.5kg per pax
          outletId: 'o1',
        },
      ];
      const mockMenus = [{ id: 'men-1', recipeIds: ['rec-1'], outletId: 'o1' }];
      const mockEvents = [
        {
          id: 'event-past',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          menuId: 'men-1',
          pax: 20,
          outletId: 'o1',
        },
        {
          id: 'event-future',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          menuId: 'men-1',
          pax: 10,
          outletId: 'o1',
        },
      ];
      const mockBatches = [
        {
          id: 'bat-1',
          ingredientId: 'ing-1',
          currentQuantity: 5,
          status: 'ACTIVE',
          outletId: 'o1',
        },
      ];

      // Mock firestore responses for each collection
      vi.mocked(getDocs).mockImplementation((q: any) => {
        const path = q?.path || ''; // In real tests, we'd check collection() calls
        // The service calls fetchCollection in a specific order: ingredients, events, menus, recipes, fetchActiveBatches
        // But it uses Promise.all, so we need to be careful.
        // However, our fetchCollection helper uses the collection names.
        return Promise.resolve({
          docs: [], // Handled by implementation below
        }) as any;
      });

      // A more robust way to mock multiple getDocs calls for different collections
      let callCount = 0;
      vi.mocked(getDocs).mockImplementation(() => {
        let data: any[] = [];
        if (callCount === 0) data = mockIngredients;
        else if (callCount === 1) data = mockEvents;
        else if (callCount === 2) data = mockMenus;
        else if (callCount === 3) data = mockRecipes;
        else if (callCount === 4) data = mockBatches;

        callCount++;
        return Promise.resolve({
          docs: data.map((d) => ({ id: d.id, data: () => d })),
        }) as any;
      });

      const context = await inventoryAnalyticsService.getInventoryContext('o1', 30, 14);

      expect(context.totalFuturePax).toBe(10);
      expect(context.ingredients).toHaveLength(1);

      const ing = context.ingredients[0];
      expect(ing.currentStock).toBe(5);

      // Historical: 20 pax * 0.5kg = 10kg
      expect(ing.usageHistory?.totalConsumed).toBe(10);
      expect(ing.usageHistory?.avgDaily).toBe(10 / 30);

      // Future: 10 pax * 0.5kg = 5kg
      expect(ing.futureDemand?.neededQuantity).toBe(5);
      expect(ing.futureDemand?.eventCount).toBe(1);
    });

    it('should handle missing data gracefully', async () => {
      const { getDocs } = await import('firebase/firestore');
      vi.mocked(getDocs).mockResolvedValue({ docs: [] } as any);

      const context = await inventoryAnalyticsService.getInventoryContext('o1');

      expect(context.ingredients).toHaveLength(0);
      expect(context.totalFuturePax).toBe(0);
    });
  });
});

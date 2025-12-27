import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consumeStockFIFO, recordPhysicalCount } from './inventoryService';
import { IngredientBatch } from '@/types';
import { firestoreService } from '@/services/firestoreService';

vi.mock('./firestoreService', () => ({
    firestoreService: {
        getById: vi.fn(),
        update: vi.fn()
    },
    addDocument: vi.fn()
}));

describe('InventoryService - consumeStockFIFO', () => {
    // Helper to create batches
    const createBatch = (id: string, qty: number, expiry: string): IngredientBatch => ({
        id,
        currentQuantity: qty,
        expiresAt: expiry,
        // Mock required fields
        ingredientId: 'ing-1',
        initialQuantity: qty,
        unit: 'kg',
        batchNumber: `BATCH-${id}`,
        receivedAt: '2025-01-01',
        costPerUnit: 10,
        outletId: 'outlet-1',
        status: 'ACTIVE'
    });

    it('should completely consume the oldest batch first', () => {
        const batch1 = createBatch('1', 10, '2025-02-01T00:00:00Z'); // Oldest
        const batch2 = createBatch('2', 10, '2025-03-01T00:00:00Z'); // Newest

        const { newBatches, consumed } = consumeStockFIFO([batch2, batch1], 10);

        // Expect batch1 to be gone, batch2 to remain full
        expect(consumed).toBe(10);
        expect(newBatches).toHaveLength(1);
        expect(newBatches[0].id).toBe('2');
        expect(newBatches[0].currentQuantity).toBe(10);
    });

    it('should partially consume a single batch', () => {
        const batch1 = createBatch('1', 10, '2025-02-01T00:00:00Z');

        const { newBatches, consumed } = consumeStockFIFO([batch1], 4);

        expect(consumed).toBe(4);
        expect(newBatches).toHaveLength(1);
        expect(newBatches[0].id).toBe('1');
        expect(newBatches[0].currentQuantity).toBe(6);
    });

    it('should consume across multiple batches', () => {
        const batch1 = createBatch('1', 10, '2025-02-01T00:00:00Z'); // Exp: Feb
        const batch2 = createBatch('2', 5, '2025-03-01T00:00:00Z');  // Exp: Mar
        const batch3 = createBatch('3', 20, '2025-04-01T00:00:00Z'); // Exp: Apr

        // Consume 10 (batch1) + 5 (batch2) + 2 (from batch3) = 17
        const { newBatches, consumed } = consumeStockFIFO([batch3, batch1, batch2], 17);

        // batch1 (10) -> consumed
        // batch2 (5) -> consumed
        // batch3 (20) -> 18 left
        expect(consumed).toBe(17);
        expect(newBatches).toHaveLength(1);
        expect(newBatches[0].id).toBe('3');
        expect(newBatches[0].currentQuantity).toBe(18);
    });

    it('should handle insufficient stock by consuming everything available', () => {
        const batch1 = createBatch('1', 5, '2025-02-01T00:00:00Z');

        // Request 10, verify it doesn't crash and returns empty
        const { newBatches, consumed } = consumeStockFIFO([batch1], 10);

        expect(consumed).toBe(5);
        expect(newBatches).toHaveLength(0);
    });

    it('should handle same expiry date (stable sort or arbitrary)', () => {
        const batch1 = createBatch('1', 10, '2025-02-01T00:00:00Z');
        const batch2 = createBatch('2', 10, '2025-02-01T00:00:00Z');

        const { newBatches, consumed } = consumeStockFIFO([batch1, batch2], 15);

        expect(consumed).toBe(15);
        expect(newBatches).toHaveLength(1);
        expect(newBatches[0].currentQuantity).toBe(5);
    });

    it('should handle empty input batches', () => {
        const { newBatches, consumed } = consumeStockFIFO([], 10);
        expect(consumed).toBe(0);
        expect(newBatches).toHaveLength(0);
    });
});

describe('InventoryService - recordPhysicalCount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate variance and update stock correctly', async () => {
        const mockItem = {
            id: 'item-1',
            ingredientId: 'ing-1',
            stock: 10,
            theoreticalStock: 12,
            costPerUnit: 5,
            outletId: 'outlet-1'
        };

        (firestoreService.getById as any).mockResolvedValue(mockItem);

        const result = await recordPhysicalCount('item-1', 15, 'user-1', 'Count notes');

        // Variance = Real (15) - Theoretical (12) = 3
        expect(result.variance).toBe(3);

        // Verify update call
        expect(firestoreService.update).toHaveBeenCalledWith(
            expect.any(String),
            'item-1',
            expect.objectContaining({
                stock: 15,
                theoreticalStock: 15,
                lastPhysicalCount: 15
            })
        );
    });

    it('should use current stock as theoretical if theoreticalStock is missing', async () => {
        const mockItem = {
            id: 'item-2',
            stock: 20,
            // theoreticalStock missing
            costPerUnit: 2,
            outletId: 'outlet-1'
        };

        (firestoreService.getById as any).mockResolvedValue(mockItem);

        const result = await recordPhysicalCount('item-2', 18, 'user-1');

        // Variance = 18 - 20 = -2
        expect(result.variance).toBe(-2);
    });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';

// Mock firebase-admin
vi.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: vi.fn(),
    getAll: vi.fn(),
    batch: vi.fn(),
  };
  return {
    firestore: Object.assign(vi.fn(() => firestoreMock), { FieldValue: { serverTimestamp: vi.fn() } }),
    initializeApp: vi.fn(),
  };
});

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => {
  return {
    onCall: (handler: any) => handler,
    HttpsError: class extends Error {
        code: string;
        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
  };
});

// Import the function to test
import { generatePurchaseOrder } from './orderGenerator';

describe('generatePurchaseOrder', () => {
    let db: any;
    let batch: any;

    beforeEach(() => {
        vi.clearAllMocks();
        db = admin.firestore();
        batch = {
            set: vi.fn(),
            commit: vi.fn(),
        };
        db.batch.mockReturnValue(batch);
    });

    it('should generate orders efficiently', async () => {
        const outletId = 'outlet1';

        // Mock Ingredients
        const ingredients = [
            { id: 'ing1', data: () => ({ name: 'Flour', currentStock: 5, parLevel: 10, supplierId: 'sup1', unit: 'kg', costPerUnit: 2, outletId }) },
            { id: 'ing2', data: () => ({ name: 'Sugar', currentStock: 2, parLevel: 5, supplierId: 'sup2', unit: 'kg', costPerUnit: 3, outletId }) },
            { id: 'ing3', data: () => ({ name: 'Salt', currentStock: 1, parLevel: 2, supplierId: 'sup1', unit: 'kg', costPerUnit: 1, outletId }) }, // Same supplier as ing1
        ];

        // Mock Collection Get (Ingredients)
        const ingredientsSnap = {
            empty: false,
            docs: ingredients
        };
        const query = { get: vi.fn().mockResolvedValue(ingredientsSnap) };
        const collection = { where: vi.fn().mockReturnValue(query), doc: vi.fn() };
        db.collection.mockImplementation((name: string) => {
             if (name === 'ingredients') return collection;
             if (name === 'purchaseOrders') return { doc: vi.fn().mockReturnValue({ id: 'newOrderId' }) };
             if (name === 'suppliers') return { doc: (id: string) => ({ id }) }; // Mock doc ref creation
             return collection;
        });

        // Mock getAll for Suppliers
        const sup1Doc = { exists: true, id: 'sup1', data: () => ({ name: 'Supplier One' }) };
        const sup2Doc = { exists: true, id: 'sup2', data: () => ({ name: 'Supplier Two' }) };
        db.getAll.mockResolvedValue([sup1Doc, sup2Doc]);

        const request = {
            data: { outletId },
            auth: { uid: 'user1' }
        };

        const result = await generatePurchaseOrder(request);

        expect(result.success).toBe(true);
        expect(result.ordersCreated).toHaveLength(2); // 2 suppliers

        // Check that getAll was called
        expect(db.getAll).toHaveBeenCalled();
        const getAllArgs = db.getAll.mock.calls[0];
        expect(getAllArgs).toHaveLength(2); // Should have requested 2 supplier docs
        expect(getAllArgs[0].id).toBe('sup1'); // Check if they are doc refs (mocked objects)
        expect(getAllArgs[1].id).toBe('sup2');

        // Check Batch Sets
        expect(batch.set).toHaveBeenCalledTimes(2);

        // Verify supplier names in orders
        const calls = batch.set.mock.calls;
        const order1 = calls.find((c: any) => c[1].supplierId === 'sup1')[1];
        const order2 = calls.find((c: any) => c[1].supplierId === 'sup2')[1];

        expect(order1.supplierName).toBe('Supplier One');
        expect(order2.supplierName).toBe('Supplier Two');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreIngredientRepositoryAdapter } from './CoreIngredientRepositoryAdapter';
import { IIngredientRepository as ILegacyIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Quantity } from '@culinaryos/core/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/domain/value-objects/Unit';

// Mock IngredientAdapter to isolate tests
vi.mock('@/adapters/IngredientAdapter', () => ({
  toCore: vi.fn((legacy) => ({ id: legacy.id, name: legacy.name, mapped: true })),
}));

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'generated-id' })),
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'generated-id' })),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      id: 'generated-id',
      data: () => ({
        name: 'Tomato',
        outletId: 'outlet-1',
        category: 'produce',
        unit: 'kg',
        currentStock: 10,
        minimumStock: 5,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      }),
    })
  ),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [
        {
          id: '1',
          data: () => ({ name: 'Ing 1', outletId: 'outlet-1', unit: 'kg' }),
        },
      ],
    })
  ),
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

describe('CoreIngredientRepositoryAdapter', () => {
  let adapter: CoreIngredientRepositoryAdapter;
  let mockLegacyRepo: ILegacyIngredientRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLegacyRepo = {
      getIngredients: vi.fn(),
      getIngredientById: vi.fn(),
      createIngredient: vi.fn(),
      updateIngredient: vi.fn(),
      deleteIngredient: vi.fn(),
      updateStock: vi.fn(),
      updateCost: vi.fn(),
    } as unknown as ILegacyIngredientRepository;

    adapter = new CoreIngredientRepositoryAdapter(mockLegacyRepo);
  });

  it('findByOutletId calls firestore getDocs and maps results', async () => {
    const { getDocs } = await import('firebase/firestore');

    const result = await adapter.findByOutletId('outlet-1');

    expect(getDocs).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].name).toBe('Ing 1');
  });

  it('findById calls firestore getDoc and maps result', async () => {
    const result = await adapter.findById('1');

    const { getDoc } = await import('firebase/firestore');
    expect(getDoc).toHaveBeenCalled();
    expect(result?.id).toBe('generated-id');
    expect(result?.name).toBe('Tomato');
  });

  it('findById returns null if firestore doc does not exist', async () => {
    const { getDoc } = await import('firebase/firestore');
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as any);

    const result = await adapter.findById('1');
    expect(result).toBeNull();
  });

  it('create generates ID and delegates to firestore', async () => {
    const dto = {
      name: 'Tomato',
      outletId: 'outlet-1',
      category: 'produce',
      unit: 'kg',
      minimumStock: new Quantity(5, new Unit('kg')),
      quantity: new Quantity(2, new Unit('kg' as any)),
    };

    const { getDoc, addDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'generated-id',
      data: () => ({
        name: 'Tomato',
        outletId: 'outlet-1',
        category: 'produce',
        unit: 'kg',
        currentStock: 0,
        minimumStock: 5,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      }),
    } as any);

    const result = await adapter.create(dto);

    expect(addDoc).toHaveBeenCalled();
    expect(result.id).toBe('generated-id');
    expect(result.name).toBe('Tomato');
  });
});

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
}));

vi.mock('@/config/firebase', () => ({
  db: {},
}));

describe('CoreIngredientRepositoryAdapter', () => {
  let adapter: CoreIngredientRepositoryAdapter;
  let mockLegacyRepo: ILegacyIngredientRepository;

  beforeEach(() => {
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

  it('findByOutletId calls getIngredients and maps results', async () => {
    const legacyIngredients = [
      { id: '1', name: 'Ing 1' } as LegacyIngredient,
      { id: '2', name: 'Ing 2' } as LegacyIngredient,
    ];
    (mockLegacyRepo.getIngredients as any).mockResolvedValue(legacyIngredients);

    const result = await adapter.findByOutletId('outlet-1');

    expect(mockLegacyRepo.getIngredients).toHaveBeenCalledWith('outlet-1');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: '1', name: 'Ing 1', mapped: true });
  });

  it('findById calls getIngredientById and maps result', async () => {
    const legacyIngredient = { id: '1', name: 'Ing 1' } as LegacyIngredient;
    (mockLegacyRepo.getIngredientById as any).mockResolvedValue(legacyIngredient);

    const result = await adapter.findById('1');

    expect(mockLegacyRepo.getIngredientById).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1', name: 'Ing 1', mapped: true });
  });

  it('findById returns null if legacy repo returns null', async () => {
    (mockLegacyRepo.getIngredientById as any).mockResolvedValue(null);
    const result = await adapter.findById('1');
    expect(result).toBeNull();
  });

  it('create generates ID and delegates to legacyRepo', async () => {
    const dto = {
      name: 'Tomato',
      outletId: 'outlet-1',
      category: 'produce',
      unit: 'kg',
      minimumStock: new Quantity(5, new Unit('kg')),
    };

    const result = await adapter.create(dto);

    expect(mockLegacyRepo.createIngredient).toHaveBeenCalled();
    const call = vi.mocked(mockLegacyRepo.createIngredient).mock.calls[0][0];
    expect(call.id).toBe('generated-id');
    expect(call.name).toBe('Tomato');
    expect(result.id).toBe('generated-id');
  });
});

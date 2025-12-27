import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFichaTecnicaVersionUseCase } from './CreateFichaTecnicaVersionUseCase';
import { GetFichaTecnicaVersionsUseCase } from './GetFichaTecnicaVersionsUseCase';
import { GetIngredientUsageHistoryUseCase } from './GetIngredientUsageHistoryUseCase';
import { CompareVersionsUseCase } from './CompareVersionsUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { Money } from '../../domain/value-objects/Money';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit, UnitType } from '../../domain/value-objects/Unit';

// Mock mocks
const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByOutlet: vi.fn(),
  findByCategory: vi.fn(),
  findByOutletId: vi.fn(),
  createVersion: vi.fn(),
  getVersions: vi.fn(),
  findVersionsByIngredient: vi.fn(),
  getVersion: vi.fn(),
} as unknown as IFichaTecnicaRepository;

describe('Versioning Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateFichaTecnicaVersionUseCase', () => {
    it('should create a version from current ficha', async () => {
      const useCase = new CreateFichaTecnicaVersionUseCase(mockRepo);
      const ficha = { id: 'ft-1', version: 1, name: 'Recipe 1' } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(ficha);
      vi.mocked(mockRepo.createVersion).mockResolvedValue({
        ...ficha,
        versionNumber: 1,
        snapshot: ficha,
      } as any);

      await useCase.execute('ft-1', 'Updated recipe');

      expect(mockRepo.createVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          fichaId: 'ft-1',
          versionNumber: 1,
          reason: 'Updated recipe',
        })
      );
    });
  });

  describe('GetFichaTecnicaVersionsUseCase', () => {
    it('should retrieve versions', async () => {
      const useCase = new GetFichaTecnicaVersionsUseCase(mockRepo);
      await useCase.execute('ft-1');
      expect(mockRepo.getVersions).toHaveBeenCalledWith('ft-1');
    });
  });

  describe('GetIngredientUsageHistoryUseCase', () => {
    it('should retrieve usage history', async () => {
      const useCase = new GetIngredientUsageHistoryUseCase(mockRepo);
      const versions = [
        {
          fichaId: 'ft-1',
          versionNumber: 1,
          createdAt: new Date(),
          snapshot: {
            name: 'Recipe 1',
            ingredients: [{ ingredientId: 'ing-1', quantity: { value: 10, unit: 'kg' } }],
          },
        },
      ] as any;

      vi.mocked(mockRepo.findVersionsByIngredient).mockResolvedValue(versions);

      const result = await useCase.execute('ing-1', 'outlet-1');

      expect(mockRepo.findVersionsByIngredient).toHaveBeenCalledWith('ing-1', 'outlet-1');
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(10);
    });
  });

  describe('CompareVersionsUseCase', () => {
    it('should compare two versions correctly', async () => {
      const useCase = new CompareVersionsUseCase(mockRepo);

      const fichaA = {
        id: 'ft-1',
        totalCost: new Money(10, 'EUR'), // 10.00
        prepTime: 30,
        ingredients: [
          {
            ingredientId: 'i1',
            ingredientName: 'Flour',
            quantity: new Quantity(1, new Unit(UnitType.KG)),
            totalCost: new Money(2, 'EUR'),
          },
          {
            ingredientId: 'i2',
            ingredientName: 'Sugar',
            quantity: new Quantity(0.5, new Unit(UnitType.KG)),
            totalCost: new Money(1, 'EUR'),
          },
        ],
      } as any;

      const fichaB = {
        id: 'ft-1',
        totalCost: new Money(12, 'EUR'), // 12.00
        prepTime: 45, // +15
        ingredients: [
          {
            // Modified: More Flour
            ingredientId: 'i1',
            ingredientName: 'Flour',
            quantity: new Quantity(1.5, new Unit(UnitType.KG)),
            totalCost: new Money(3, 'EUR'), // +1
          },
          // Removed Sugar
          {
            ingredientId: 'i3',
            ingredientName: 'Butter',
            quantity: new Quantity(0.2, new Unit(UnitType.KG)),
            totalCost: new Money(4, 'EUR'), // New
          },
        ],
      } as any;

      vi.mocked(mockRepo.getVersion)
        .mockResolvedValueOnce({ snapshot: fichaA } as any)
        .mockResolvedValueOnce({ snapshot: fichaB } as any);

      const result = await useCase.execute('ft-1', 1, 2);

      expect(result.totalCostDiff.amount).toBe(2); // 12 - 10
      expect(result.prepTimeDiff).toBe(15);
      expect(result.ingredientChanges).toHaveLength(3); // Modified Flour, Removed Sugar, Added Butter

      const flour = result.ingredientChanges.find((i) => i.ingredientName === 'Flour');
      expect(flour?.type).toBe('MODIFIED');

      const sugar = result.ingredientChanges.find((i) => i.ingredientName === 'Sugar');
      expect(sugar?.type).toBe('REMOVED');

      const butter = result.ingredientChanges.find((i) => i.ingredientName === 'Butter');
      expect(butter?.type).toBe('ADDED');
    });
  });
});

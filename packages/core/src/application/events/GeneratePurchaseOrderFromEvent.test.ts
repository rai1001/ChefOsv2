import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeneratePurchaseOrderFromEvent,
  GeneratePurchaseOrderInput,
} from './GeneratePurchaseOrderFromEvent';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';
import { Money } from '../../domain/value-objects/Money';

describe('GeneratePurchaseOrderFromEvent', () => {
  let useCase: GeneratePurchaseOrderFromEvent;
  let mockEventRepo: IEventRepository;
  let mockFichaRepo: IFichaTecnicaRepository;
  let mockIngredientRepo: IIngredientRepository;
  let mockPORepo: IPurchaseOrderRepository;
  let mockTransactionManager: ITransactionManager;

  beforeEach(() => {
    mockEventRepo = { findById: vi.fn() } as any;
    mockFichaRepo = { findById: vi.fn() } as any;
    mockIngredientRepo = { findById: vi.fn() } as any;
    mockPORepo = { create: vi.fn() } as any;
    mockTransactionManager = { runTransaction: vi.fn((fn) => fn('mock-transaction')) } as any;

    useCase = new GeneratePurchaseOrderFromEvent(
      mockEventRepo,
      mockFichaRepo,
      mockIngredientRepo,
      mockPORepo,
      mockTransactionManager
    );
  });

  const mockEvent = {
    id: 'event-1',
    eventName: 'Gala Dinner',
    eventDate: new Date(),
    outletId: 'outlet-1',
    menu: [
      { fichaId: 'f-1', fichaName: 'Soup', quantity: 2 }, // 2x yield
    ],
  };

  const mockFicha = {
    id: 'f-1',
    ingredients: [{ ingredientId: 'ing-1', quantity: new Quantity(1, new Unit('kg' as any)) }],
  };

  const input: GeneratePurchaseOrderInput = {
    eventId: 'event-1',
    userId: 'user-1',
  };

  it('should generate a purchase order for missing ingredients', async () => {
    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(mockFichaRepo.findById).mockResolvedValue(mockFicha as any);
    vi.mocked(mockIngredientRepo.findById).mockResolvedValue({
      id: 'ing-1',
      name: 'Tomato',
      currentStock: new Quantity(0.5, new Unit('kg' as any)),
      lastCost: Money.fromCents(100),
    } as any);
    vi.mocked(mockPORepo.create).mockResolvedValue({ id: 'po-1' } as any);

    const result = await useCase.execute(input);

    expect(result.purchaseOrder?.id).toBe('po-1');
    expect(result.requirements[0].totalRequired.value).toBe(2); // 1kg * 2
    expect(result.requirements[0].toOrder.value).toBe(1.5); // 2 - 0.5
    expect(mockPORepo.create).toHaveBeenCalled();
  });

  it('should NOT generate a purchase order if stock is sufficient', async () => {
    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(mockFichaRepo.findById).mockResolvedValue(mockFicha as any);
    vi.mocked(mockIngredientRepo.findById).mockResolvedValue({
      id: 'ing-1',
      name: 'Tomato',
      currentStock: new Quantity(5, new Unit('kg' as any)),
    } as any);

    const result = await useCase.execute(input);

    expect(result.purchaseOrder).toBeNull();
    expect(result.requirements[0].toOrder.value).toBe(0);
    expect(result.warnings).toContain(
      'All required ingredients are in stock. No purchase order needed.'
    );
    expect(mockPORepo.create).not.toHaveBeenCalled();
  });

  it('should handle multiple recipes and ingredients correctly', async () => {
    const complexEvent = {
      ...mockEvent,
      menu: [
        { fichaId: 'f-1', quantity: 1 },
        { fichaId: 'f-2', quantity: 1 },
      ],
    };
    const ficha2 = {
      id: 'f-2',
      ingredients: [{ ingredientId: 'ing-1', quantity: new Quantity(2, new Unit('kg' as any)) }],
    };

    vi.mocked(mockEventRepo.findById).mockResolvedValue(complexEvent as any);
    vi.mocked(mockFichaRepo.findById).mockImplementation(async (id) => {
      if (id === 'f-1') return mockFicha as any;
      if (id === 'f-2') return ficha2 as any;
      return null;
    });
    vi.mocked(mockIngredientRepo.findById).mockResolvedValue({
      id: 'ing-1',
      name: 'Tomato',
      currentStock: new Quantity(0, new Unit('kg' as any)),
    } as any);
    vi.mocked(mockPORepo.create).mockResolvedValue({ id: 'po-2' } as any);

    const result = await useCase.execute(input);

    expect(result.requirements[0].totalRequired.value).toBe(3); // 1 (f-1) + 2 (f-2)
  });
});

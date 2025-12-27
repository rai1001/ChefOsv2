import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GenerateProductionTasksFromEvent,
  GenerateProductionTasksInput,
} from './GenerateProductionTasksFromEvent';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';
import { ProductionStation, TaskPriority } from '../../domain/entities/ProductionTask';
import { Quantity } from '../../domain/value-objects/Quantity';
import { Unit } from '../../domain/value-objects/Unit';

describe('GenerateProductionTasksFromEvent', () => {
  let useCase: GenerateProductionTasksFromEvent;
  let mockEventRepo: IEventRepository;
  let mockFichaRepo: IFichaTecnicaRepository;
  let mockTaskRepo: IProductionTaskRepository;
  let mockTransactionManager: ITransactionManager;

  beforeEach(() => {
    mockEventRepo = { findById: vi.fn() } as any;
    mockFichaRepo = { findById: vi.fn() } as any;
    mockTaskRepo = { create: vi.fn() } as any;
    mockTransactionManager = {
      runTransaction: vi.fn((fn) => fn('mock-transaction')),
    } as any;
    useCase = new GenerateProductionTasksFromEvent(
      mockEventRepo,
      mockFichaRepo,
      mockTaskRepo,
      mockTransactionManager
    );
  });

  const eventDate = new Date();
  eventDate.setHours(eventDate.getHours() + 48); // 48 hours from now

  const mockEvent = {
    id: 'event-1',
    eventName: 'Test Event',
    eventDate: eventDate,
    outletId: 'outlet-1',
    numberOfGuests: 100,
    menu: [
      { fichaId: 'f-1', fichaName: 'Ice Cream', quantity: 2 }, // 2x yield
    ],
  };

  const input: GenerateProductionTasksInput = {
    eventId: 'event-1',
    userId: 'user-1',
  };

  it('should generate production tasks for event menu items', async () => {
    const mockFicha = {
      id: 'f-1',
      name: 'Ice Cream',
      category: 'Dessert',
      yield: new Quantity(10, new Unit('portion' as any)),
      prepTime: 30,
      cookTime: 0,
    };

    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(mockFichaRepo.findById).mockResolvedValue(mockFicha as any);
    vi.mocked(mockTaskRepo.create).mockResolvedValue({ id: 'task-1' } as any);

    const result = await useCase.execute(input);

    expect(result.tasks).toHaveLength(1);
    expect(mockTaskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        station: ProductionStation.PASTRY,
        priority: TaskPriority.HIGH, // 48 hours = High
        quantity: expect.objectContaining({ value: 20 }), // 10 * 2
      }),
      expect.any(Object)
    );
  });

  it('should handle missing recipes with warnings', async () => {
    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(mockFichaRepo.findById).mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(result.tasks).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Recipe Ice Cream not found');
  });

  it('should throw error if event not found', async () => {
    vi.mocked(mockEventRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow('Event with ID event-1 not found');
  });

  it('should correctly determine stations for different categories', async () => {
    const categories = [
      { cat: 'Dessert', expected: ProductionStation.PASTRY },
      { cat: 'Grill', expected: ProductionStation.GRILL },
      { cat: 'Salad', expected: ProductionStation.COLD_KITCHEN },
      { cat: 'Bakery', expected: ProductionStation.BAKERY },
      { cat: 'Butcher', expected: ProductionStation.BUTCHERY },
      { cat: 'Generic', expected: ProductionStation.HOT_KITCHEN },
    ];

    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);
    vi.mocked(mockTaskRepo.create).mockResolvedValue({} as any);

    for (const { cat, expected } of categories) {
      vi.mocked(mockFichaRepo.findById).mockResolvedValueOnce({
        id: 'f-test',
        category: cat,
        yield: new Quantity(1, new Unit('p' as any)),
      } as any);

      await useCase.execute(input);
      const callArgs = vi.mocked(mockTaskRepo.create).mock.calls[
        vi.mocked(mockTaskRepo.create).mock.calls.length - 1
      ][0];
      expect(callArgs.station).toBe(expected);
    }
  });
});

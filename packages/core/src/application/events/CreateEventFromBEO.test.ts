import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEventFromBEO, CreateEventFromBEOInput } from './CreateEventFromBEO';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';

describe('CreateEventFromBEO', () => {
  let useCase: CreateEventFromBEO;
  let mockEventRepo: IEventRepository;
  let mockFichaRepo: IFichaTecnicaRepository;
  let mockTransactionManager: ITransactionManager;

  beforeEach(() => {
    mockEventRepo = {
      create: vi.fn(),
    } as any;
    mockFichaRepo = {
      findByOutletId: vi.fn(),
    } as any;
    mockTransactionManager = {
      runTransaction: vi.fn((fn) => fn('mock-transaction')),
    } as any;
    useCase = new CreateEventFromBEO(mockEventRepo, mockFichaRepo, mockTransactionManager);
  });

  const validScanResult = {
    eventName: 'Wedding Ceremony',
    eventDate: new Date(),
    menuItems: [
      { name: 'Tomato Soup', portions: 50 },
      { name: 'Beef Wellington', portions: 50 },
    ],
    confidence: 0.9,
    numberOfGuests: 50,
  };

  const input: CreateEventFromBEOInput = {
    outletId: 'outlet-1',
    scanResult: validScanResult as any,
    userId: 'user-1',
  };

  it('should create an event when menu items match recipes', async () => {
    const mockFichas = [
      { id: 'f-1', name: 'Tomato Soup' },
      { id: 'f-2', name: 'Beef Wellington' },
    ];

    vi.mocked(mockFichaRepo.findByOutletId).mockResolvedValue(mockFichas as any);
    vi.mocked(mockEventRepo.create).mockResolvedValue({ id: 'event-1' } as any);

    const result = await useCase.execute(input);

    expect(result.event.id).toBe('event-1');
    expect(result.warnings).toHaveLength(0);
    expect(mockEventRepo.create).toHaveBeenCalled();
  });

  it('should add warnings for unmatched menu items', async () => {
    const mockFichas = [{ id: 'f-1', name: 'Tomato Soup' }];

    vi.mocked(mockFichaRepo.findByOutletId).mockResolvedValue(mockFichas as any);
    vi.mocked(mockEventRepo.create).mockResolvedValue({ id: 'event-1' } as any);

    const result = await useCase.execute(input);

    expect(result.warnings).toContain('No matching recipe found for menu item: Beef Wellington');
    expect(result.unmatchedMenuItems).toContain('Beef Wellington');
  });

  it('should throw error if no menu items match', async () => {
    vi.mocked(mockFichaRepo.findByOutletId).mockResolvedValue([]);

    await expect(useCase.execute(input)).rejects.toThrow('No menu items could be matched');
  });

  it('should throw error if event name is missing', async () => {
    const badInput = { ...input, scanResult: { ...validScanResult, eventName: '' } };
    await expect(useCase.execute(badInput as any)).rejects.toThrow('Event name is required');
  });

  it('should add a warning for low confidence scan result', async () => {
    const lowConfidenceInput = {
      ...input,
      scanResult: { ...validScanResult, confidence: 0.5 },
    };
    const mockFichas = [{ id: 'f-1', name: 'Tomato Soup' }];
    vi.mocked(mockFichaRepo.findByOutletId).mockResolvedValue(mockFichas as any);
    vi.mocked(mockEventRepo.create).mockResolvedValue({ id: 'event-1' } as any);

    const result = await useCase.execute(lowConfidenceInput as any);

    expect(result.warnings).toContain('Low confidence scan result: 50%');
  });
});

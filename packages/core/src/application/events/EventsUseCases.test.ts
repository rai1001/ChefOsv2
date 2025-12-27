import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEventUseCase } from './CreateEventUseCase';
import { UpdateEventUseCase } from './UpdateEventUseCase';
import { DeleteEventUseCase } from './DeleteEventUseCase';
import { GetEventsUseCase } from './GetEventsUseCase';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';
import { EventStatus } from '../../domain/entities/Event';

// Mock mocks
const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  findByOutlet: vi.fn(),
  findByDateRange: vi.fn(),
  findByStatus: vi.fn(),
  delete: vi.fn(),
} as unknown as IEventRepository;

describe('Events Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateEventUseCase', () => {
    it('should create an event successfully', async () => {
      const useCase = new CreateEventUseCase(mockRepo);
      const dto = {
        outletId: 'outlet-1',
        eventName: 'Wedding',
        eventDate: new Date(),
        numberOfGuests: 100,
        eventType: 'Wedding',
        menu: [],
      };

      const expectedEvent = { id: 'evt-1', ...dto, status: EventStatus.DRAFT } as any;
      vi.mocked(mockRepo.create).mockResolvedValue(expectedEvent);

      const result = await useCase.execute(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedEvent);
    });

    it('should throw if required fields are missing', async () => {
      const useCase = new CreateEventUseCase(mockRepo);
      await expect(useCase.execute({} as any)).rejects.toThrow();
    });
  });

  describe('UpdateEventUseCase', () => {
    it('should update event details', async () => {
      const useCase = new UpdateEventUseCase(mockRepo);
      const event = { id: 'evt-1', eventName: 'Old Name' } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(event);
      vi.mocked(mockRepo.update).mockResolvedValue({ ...event, eventName: 'New Name' });

      await useCase.execute('evt-1', { eventName: 'New Name' });

      expect(mockRepo.update).toHaveBeenCalledWith('evt-1', { eventName: 'New Name' });
    });
  });

  describe('DeleteEventUseCase', () => {
    it('should delete event', async () => {
      const useCase = new DeleteEventUseCase(mockRepo);
      const event = { id: 'evt-1' } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(event);

      await useCase.execute('evt-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('evt-1');
    });
  });

  describe('GetEventsUseCase', () => {
    it('should get events by date range', async () => {
      const useCase = new GetEventsUseCase(mockRepo);
      const start = new Date();
      const end = new Date();
      await useCase.execute('outlet-1', { startDate: start, endDate: end });
      expect(mockRepo.findByDateRange).toHaveBeenCalledWith('outlet-1', start, end);
    });

    it('should get all events for outlet if no date range', async () => {
      const useCase = new GetEventsUseCase(mockRepo);
      await useCase.execute('outlet-1');
      expect(mockRepo.findByOutlet).toHaveBeenCalledWith('outlet-1');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProductionTaskUseCase } from './CreateProductionTaskUseCase';
import { UpdateTaskStatusUseCase } from './UpdateTaskStatusUseCase';
import { AssignTaskUseCase } from './AssignTaskUseCase';
import { CompleteTaskUseCase } from './CompleteTaskUseCase';
import { ScheduleProductionUseCase } from './ScheduleProductionUseCase';
import { IProductionTaskRepository } from '../../infrastructure/repositories/IProductionTaskRepository';
import {
  ProductionTaskStatus,
  ProductionStation,
  TaskPriority,
} from '../../domain/entities/ProductionTask';

// Mock mocks
const mockRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  findByOutlet: vi.fn(),
  findByStatus: vi.fn(),
  findByStation: vi.fn(),
  findByDateRange: vi.fn(),
  findByEvent: vi.fn(),
  delete: vi.fn(),
} as unknown as IProductionTaskRepository;

describe('Production Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateProductionTaskUseCase', () => {
    it('should create a task successfully', async () => {
      const useCase = new CreateProductionTaskUseCase(mockRepo);
      const dto = {
        outletId: 'outlet-1',
        fichaId: 'ficha-1',
        quantity: { value: 5, unit: 'kg' } as any,
        station: ProductionStation.PREP,
        scheduledFor: new Date(),
      };

      const expectedTask = { id: 'task-1', ...dto, status: ProductionTaskStatus.PENDING } as any;
      vi.mocked(mockRepo.create).mockResolvedValue(expectedTask);

      const result = await useCase.execute(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedTask);
    });

    it('should throw if required fields are missing', async () => {
      const useCase = new CreateProductionTaskUseCase(mockRepo);
      await expect(useCase.execute({} as any)).rejects.toThrow();
    });
  });

  describe('UpdateTaskStatusUseCase', () => {
    it('should update status and tracked times', async () => {
      const useCase = new UpdateTaskStatusUseCase(mockRepo);
      const task = { id: 'task-1', status: ProductionTaskStatus.PENDING } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(task);
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...task,
        status: ProductionTaskStatus.IN_PROGRESS,
      });

      await useCase.execute('task-1', ProductionTaskStatus.IN_PROGRESS);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          status: ProductionTaskStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        })
      );
    });
  });

  describe('CompleteTaskUseCase', () => {
    it('should complete task via UpdateTaskStatusUseCase', async () => {
      const updateStatusUseCase = new UpdateTaskStatusUseCase(mockRepo);
      const useCase = new CompleteTaskUseCase(mockRepo, updateStatusUseCase);

      const task = {
        id: 'task-1',
        status: ProductionTaskStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 60000),
      } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(task);

      // Mock the update call inside UpdateTaskStatusUseCase
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...task,
        status: ProductionTaskStatus.COMPLETED,
      });

      await useCase.execute('task-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          status: ProductionTaskStatus.COMPLETED,
          completedAt: expect.any(Date),
          actualDuration: expect.any(Number),
        })
      );
    });
  });

  describe('AssignTaskUseCase', () => {
    it('should assign a task', async () => {
      const useCase = new AssignTaskUseCase(mockRepo);
      const task = { id: 'task-1' } as any;
      vi.mocked(mockRepo.findById).mockResolvedValue(task);
      vi.mocked(mockRepo.update).mockResolvedValue({ ...task, assignedTo: 'chef-1' });

      await useCase.execute('task-1', 'chef-1');

      expect(mockRepo.update).toHaveBeenCalledWith('task-1', { assignedTo: 'chef-1' });
    });
  });

  describe('ScheduleProductionUseCase', () => {
    it('should schedule a task', async () => {
      const useCase = new ScheduleProductionUseCase(mockRepo);
      const task = { id: 'task-1' } as any;
      const date = new Date();

      vi.mocked(mockRepo.findById).mockResolvedValue(task);
      vi.mocked(mockRepo.update).mockResolvedValue({ ...task, scheduledFor: date });

      await useCase.execute('task-1', date);

      expect(mockRepo.update).toHaveBeenCalledWith('task-1', { scheduledFor: date });
    });
  });
});

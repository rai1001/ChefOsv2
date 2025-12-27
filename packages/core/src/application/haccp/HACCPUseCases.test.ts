import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateHACCPLogUseCase } from './CreateHACCPLogUseCase';
import { GetDailyHACCPTasksUseCase } from './GetDailyHACCPTasksUseCase';
import { GetHACCPLogsUseCase } from './GetHACCPLogsUseCase';
import { IHACCPRepository } from '../../infrastructure/repositories/IHACCPRepository';
import { HACCPFrequency } from '../../domain/entities/HACCPLog';

// Mock mocks
const mockRepo = {
  createLog: vi.fn(),
  getLogs: vi.fn(),
  getTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
} as unknown as IHACCPRepository;

describe('HACCP Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateHACCPLogUseCase', () => {
    it('should create a log and check compliance (PASS)', async () => {
      const useCase = new CreateHACCPLogUseCase(mockRepo);
      const task = {
        id: 'task-1',
        name: 'Fridge Temp',
        criticalLimits: { min: 0, max: 5 },
      } as any;

      vi.mocked(mockRepo.getTaskById).mockResolvedValue(task);
      vi.mocked(mockRepo.createLog).mockResolvedValue({} as any);

      await useCase.execute({
        outletId: 'outlet-1',
        taskId: 'task-1',
        value: 3,
        verifiedBy: 'chef',
      });

      expect(mockRepo.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          isCompliant: true,
          taskName: 'Fridge Temp',
        })
      );
    });

    it('should create a log and check compliance (FAIL)', async () => {
      const useCase = new CreateHACCPLogUseCase(mockRepo);
      const task = {
        id: 'task-1',
        name: 'Fridge Temp',
        criticalLimits: { min: 0, max: 5 },
      } as any;

      vi.mocked(mockRepo.getTaskById).mockResolvedValue(task);
      vi.mocked(mockRepo.createLog).mockResolvedValue({} as any);

      await useCase.execute({
        outletId: 'outlet-1',
        taskId: 'task-1',
        value: 8, // Too high
        verifiedBy: 'chef',
      });

      expect(mockRepo.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          isCompliant: false,
        })
      );
    });
  });

  describe('GetDailyHACCPTasksUseCase', () => {
    it('should retrieve active tasks', async () => {
      const useCase = new GetDailyHACCPTasksUseCase(mockRepo);
      const tasks = [
        { id: 't1', frequency: HACCPFrequency.DAILY, isActive: true },
        { id: 't2', frequency: HACCPFrequency.DAILY, isActive: false },
      ] as any;

      vi.mocked(mockRepo.getTasks).mockResolvedValue(tasks);

      const result = await useCase.execute('outlet-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });
  });
});

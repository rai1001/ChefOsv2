import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigurePCCUseCase } from './ConfigurePCCUseCase';
import { RecordCheckpointUseCase } from './RecordCheckpointUseCase';
import { RegisterCorrectiveActionUseCase } from './RegisterCorrectiveActionUseCase';
import { ValidateHACCPComplianceUseCase } from './ValidateHACCPComplianceUseCase';
import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';
import { ControlPointType, Frequency } from '../../domain/entities/ControlPoint';
import { HaccpResult } from '../../domain/entities/HACCPRecord';

const mockRepo = {
  saveControlPoint: vi.fn(),
  getControlPoint: vi.fn(),
  getControlPointsByOutlet: vi.fn(),
  getCorrectiveActions: vi.fn(),
  getCorrectiveAction: vi.fn(),
  saveRecord: vi.fn(),
  getRecord: vi.fn(),
  getRecordsByOutlet: vi.fn(),
  getRecordsByControlPoint: vi.fn(),
} as unknown as IHACCPRepository;

describe('Expanded HACCP Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConfigurePCCUseCase', () => {
    it('should create a new control point', async () => {
      const useCase = new ConfigurePCCUseCase(mockRepo);
      const dto = {
        name: 'Fridge 1 Temp',
        type: ControlPointType.TEMPERATURE,
        frequency: Frequency.DAILY,
        limits: { max: 5 },
        outletId: 'outlet-1',
      };

      const result = await useCase.execute(dto);

      expect(mockRepo.saveControlPoint).toHaveBeenCalled();
      expect(result.name).toBe('Fridge 1 Temp');
      expect(result.limits.max).toBe(5);
    });
  });

  describe('RecordCheckpointUseCase', () => {
    it('should pass if value is within limits', async () => {
      const useCase = new RecordCheckpointUseCase(mockRepo);
      const cp = { id: 'cp-1', limits: { max: 5 }, outletId: 'outlet-1' } as any;
      vi.mocked(mockRepo.getControlPoint).mockResolvedValue(cp);

      const result = await useCase.execute({
        controlPointId: 'cp-1',
        value: 4,
        userId: 'user-1',
      });

      expect(result.result).toBe(HaccpResult.PASS);
      expect(mockRepo.saveRecord).toHaveBeenCalled();
    });

    it('should fail if value exceeds max', async () => {
      const useCase = new RecordCheckpointUseCase(mockRepo);
      const cp = { id: 'cp-1', limits: { max: 5 }, outletId: 'outlet-1' } as any;
      vi.mocked(mockRepo.getControlPoint).mockResolvedValue(cp);

      const result = await useCase.execute({
        controlPointId: 'cp-1',
        value: 6,
        userId: 'user-1',
      });

      expect(result.result).toBe(HaccpResult.FAIL);
    });
  });

  describe('RegisterCorrectiveActionUseCase', () => {
    it('should update record with corrective action', async () => {
      const useCase = new RegisterCorrectiveActionUseCase(mockRepo);
      const record = { id: 'rec-1', result: HaccpResult.FAIL } as any;
      vi.mocked(mockRepo.getRecord).mockResolvedValue(record);

      await useCase.execute({
        recordId: 'rec-1',
        correctiveActionId: 'ca-1',
        userId: 'user-1',
      });

      expect(record.correctiveActionId).toBe('ca-1');
      expect(mockRepo.saveRecord).toHaveBeenCalledWith(record);
    });
  });

  describe('ValidateHACCPComplianceUseCase', () => {
    it('should calculate compliance score correctly', async () => {
      const useCase = new ValidateHACCPComplianceUseCase(mockRepo);

      // Mock 3 active CPs
      const cps = [
        { id: 'cp-1', isActive: true }, // Passed
        { id: 'cp-2', isActive: true }, // Failed + Resolved
        { id: 'cp-3', isActive: true }, // Failed + Unresolved
        { id: 'cp-4', isActive: true }, // Missing
      ] as any;

      vi.mocked(mockRepo.getControlPointsByOutlet).mockResolvedValue(cps);

      // Mock Records
      const records = [
        { controlPointId: 'cp-1', result: HaccpResult.PASS, performedAt: new Date() },
        {
          controlPointId: 'cp-2',
          result: HaccpResult.FAIL,
          correctiveActionId: 'ca-1',
          performedAt: new Date(),
        },
        { controlPointId: 'cp-3', result: HaccpResult.FAIL, performedAt: new Date() },
      ] as any;

      vi.mocked(mockRepo.getRecordsByOutlet).mockResolvedValue(records);

      const report = await useCase.execute('outlet-1');

      expect(report.totalCheckpoints).toBe(4);
      expect(report.completedCheckpoints).toBe(2);
      expect(report.complianceScore).toBe(50);
      expect(report.missingCheckpoints).toHaveLength(1); // cp-4
      expect(report.failedCheckpoints).toHaveLength(1); // cp-3
      expect(report.resolvedCheckpoints).toHaveLength(1); // cp-2
    });
  });
});

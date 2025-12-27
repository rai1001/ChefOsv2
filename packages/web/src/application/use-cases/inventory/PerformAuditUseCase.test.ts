import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformAuditUseCase } from './PerformAuditUseCase';
import { PerformAuditUseCase as CorePerformAuditUseCase } from '@culinaryos/core';
import { Quantity, Unit as CoreUnit } from '@culinaryos/core';

describe('PerformAuditUseCase (Web Adapter)', () => {
  let useCase: PerformAuditUseCase;
  let mockCoreUseCase: CorePerformAuditUseCase;

  beforeEach(() => {
    mockCoreUseCase = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as any;
    useCase = new PerformAuditUseCase(mockCoreUseCase);
  });

  it('should delegate audit to core with correct mapping', async () => {
    await useCase.execute('ing-1', 50, 'user-1', 'Tomato', 'kg' as any);

    expect(mockCoreUseCase.execute).toHaveBeenCalledWith({
      ingredientId: 'ing-1',
      measuredQuantity: expect.any(Quantity),
      performedBy: 'user-1',
      reason: 'Audit by user-1',
    });

    const callArgs = vi.mocked(mockCoreUseCase.execute).mock.calls[0][0];
    expect(callArgs.measuredQuantity.value).toBe(50);
    expect(callArgs.measuredQuantity.unit.toString()).toBe('kg');
  });
});

import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { PerformAuditUseCase as CorePerformAuditUseCase } from '@culinaryos/core';
import { Quantity, Unit as CoreUnit } from '@culinaryos/core';
import { Unit } from '@/domain/types';

@injectable()
export class PerformAuditUseCase {
  constructor(
    @inject(TYPES.CorePerformAuditUseCase) private coreUseCase: CorePerformAuditUseCase
  ) {}

  async execute(
    ingredientId: string,
    measuredQuantity: number,
    performedBy: string,
    _ingredientName: string,
    unit: Unit
  ): Promise<void> {
    await this.coreUseCase.execute({
      ingredientId,
      measuredQuantity: new Quantity(measuredQuantity, new CoreUnit(unit as any)),
      performedBy,
      reason: `Audit by ${performedBy}`,
    });
  }
}

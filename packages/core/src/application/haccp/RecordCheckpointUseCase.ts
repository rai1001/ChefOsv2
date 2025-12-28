import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';
import { HACCPRecord, HaccpResult } from '../../domain/entities/HACCPRecord';
import { ControlPoint } from '../../domain/entities/ControlPoint';
import { Unit } from '../../domain/value-objects/Unit';

export interface RecordCheckpointDTO {
  controlPointId: string;
  value: number;
  unit?: Unit;
  userId: string;
  notes?: string;
  imgUrl?: string;
  performedAt?: Date;
}

export class RecordCheckpointUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(dto: RecordCheckpointDTO): Promise<HACCPRecord> {
    const controlPoint = await this.repository.getControlPoint(dto.controlPointId);
    if (!controlPoint) {
      throw new Error(`Control Point not found: ${dto.controlPointId}`);
    }

    const result = this.evaluateResult(dto.value, controlPoint);

    const record: HACCPRecord = {
      id: crypto.randomUUID(),
      controlPointId: dto.controlPointId,
      outletId: controlPoint.outletId,
      value: dto.value,
      unit: dto.unit,
      result,
      performedBy: dto.userId,
      performedAt: dto.performedAt || new Date(),
      notes: dto.notes,
      imgUrl: dto.imgUrl,
    };

    if (result === HaccpResult.FAIL) {
      // Logic to handle auto-corrective action suggestion or notification could go here.
      // For now, we just record the failure.
    }

    await this.repository.saveRecord(record);
    return record;
  }

  private evaluateResult(value: number, cp: ControlPoint): HaccpResult {
    const { min, max } = cp.limits;

    if (min !== undefined && value < min) {
      return HaccpResult.FAIL;
    }
    if (max !== undefined && value > max) {
      return HaccpResult.FAIL;
    }

    return HaccpResult.PASS;
  }
}

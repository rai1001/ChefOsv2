import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';
import { HACCPRecord } from '../../domain/entities/HACCPRecord';

export interface RegisterCorrectiveActionDTO {
  recordId: string;
  correctiveActionId: string;
  note?: string;
  userId: string;
}

export class RegisterCorrectiveActionUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(dto: RegisterCorrectiveActionDTO): Promise<HACCPRecord> {
    const record = await this.repository.getRecord(dto.recordId);

    if (!record) {
      throw new Error(`HACCP Record not found: ${dto.recordId}`);
    }

    // Optional: Validate correctiveActionId exists via repository if strictly enforced
    // const action = await this.repository.getCorrectiveAction(dto.correctiveActionId);
    // if (!action) ...

    record.correctiveActionId = dto.correctiveActionId;
    record.correctiveActionNote = dto.note;

    // Could update verifyBy or similar if this action implies verification
    // record.verifiedBy = dto.userId;

    await this.repository.saveRecord(record);

    return record;
  }
}

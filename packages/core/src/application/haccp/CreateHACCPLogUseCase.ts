import { CreateHACCPLogDTO, HACCPLog } from '../../domain/entities/HACCPLog';
import { IHACCPRepository } from '../../infrastructure/repositories/IHACCPRepository';

export class CreateHACCPLogUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(dto: CreateHACCPLogDTO): Promise<HACCPLog> {
    const task = await this.repository.getTaskById(dto.taskId);
    if (!task) throw new Error('HACCP Task not found');

    let isCompliant = true;

    // Validate numeric limits if applicable
    if (task.criticalLimits && typeof dto.value === 'number') {
      const { min, max } = task.criticalLimits;
      if (min !== undefined && dto.value < min) isCompliant = false;
      if (max !== undefined && dto.value > max) isCompliant = false;
    }

    if (!isCompliant && !dto.correctiveAction) {
      // Optional: Could enforce corrective action here if strict mode
      // throw new Error('Corrective action required for non-compliant log');
    }

    return this.repository.createLog({
      ...dto,
      isCompliant,
      taskName: task.name,
    });
  }
}

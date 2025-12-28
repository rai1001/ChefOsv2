import {
  ControlPoint,
  ControlPointType,
  Frequency,
  ControlPointLimits,
} from '../../domain/entities/ControlPoint';
import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';

export interface ConfigurePCCDTO {
  id?: string; // If provided, update
  name: string;
  description?: string;
  type: ControlPointType;
  frequency: Frequency;
  limits: ControlPointLimits;
  outletId: string;
  requiredCorrectiveActions?: string[];
}

export class ConfigurePCCUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(dto: ConfigurePCCDTO): Promise<ControlPoint> {
    // Basic validation
    if (!dto.name) throw new Error('Name is required');
    if (!dto.outletId) throw new Error('Outlet ID is required');

    const controlPoint: ControlPoint = {
      id: dto.id || crypto.randomUUID(),
      name: dto.name,
      description: dto.description,
      type: dto.type,
      frequency: dto.frequency,
      limits: dto.limits,
      outletId: dto.outletId,
      isActive: true, // Default to active
      requiredCorrectiveActions: dto.requiredCorrectiveActions,
      createdAt: dto.id ? new Date() : new Date(), // Ideally fetch existing if updating
      updatedAt: new Date(),
    };

    if (dto.id) {
      // If updating, we might want to fetch first to preserve createdAt.
      // For simplicity in this iteration, we just save/overwrite.
      const existing = await this.repository.getControlPoint(dto.id);
      if (existing) {
        controlPoint.createdAt = existing.createdAt;
      }
    }

    await this.repository.saveControlPoint(controlPoint);
    return controlPoint;
  }
}

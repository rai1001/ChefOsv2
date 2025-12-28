import { ISupplierRepository } from '../../domain/repositories/ISupplierRepository';
import { Supplier } from '../../domain/entities/Supplier';

export interface EvaluateSupplierDTO {
  supplierId: string;
  organizationId: string;
  rating: number; // 1-5
}

export class EvaluateSupplierUseCase {
  constructor(private readonly repository: ISupplierRepository) {}

  async execute(dto: EvaluateSupplierDTO): Promise<Supplier> {
    const supplier = await this.repository.findById(dto.supplierId);

    if (!supplier) {
      throw new Error(`Supplier not found: ${dto.supplierId}`);
    }

    if (supplier.organizationId !== dto.organizationId) {
      throw new Error('Unauthorized');
    }

    // Clamp rating between 1 and 5
    const validRating = Math.max(1, Math.min(5, dto.rating));

    // Update rating.
    // NOTE: In a real system, you might average this with previous ratings or store a history.
    // For MVP Phase 3, we just set current rating.
    supplier.rating = validRating;
    supplier.updatedAt = new Date();

    await this.repository.save(supplier);
    return supplier;
  }
}

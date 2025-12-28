import { ISupplierRepository } from '../../domain/repositories/ISupplierRepository';
import { Supplier, PaymentTerm, SupplierCategory } from '../../domain/entities/Supplier';

export interface UpdateSupplierDTO {
  id: string;
  organizationId: string; // Security check
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: SupplierCategory[];
  paymentTerms?: PaymentTerm;
  isActive?: boolean;
}

export class UpdateSupplierUseCase {
  constructor(private readonly repository: ISupplierRepository) {}

  async execute(dto: UpdateSupplierDTO): Promise<Supplier> {
    const supplier = await this.repository.findById(dto.id);

    if (!supplier) {
      throw new Error(`Supplier not found: ${dto.id}`);
    }

    if (supplier.organizationId !== dto.organizationId) {
      throw new Error('Unauthorized');
    }

    // Apply updates
    if (dto.name) supplier.name = dto.name;
    if (dto.email !== undefined) supplier.email = dto.email; // Allow clearing? Assuming undefined maps to no change
    if (dto.phone !== undefined) supplier.phone = dto.phone;
    if (dto.address !== undefined) supplier.address = dto.address;
    if (dto.category) supplier.category = dto.category;
    if (dto.paymentTerms) supplier.paymentTerms = dto.paymentTerms;
    if (dto.isActive !== undefined) supplier.isActive = dto.isActive;

    supplier.updatedAt = new Date();

    await this.repository.save(supplier);
    return supplier;
  }
}

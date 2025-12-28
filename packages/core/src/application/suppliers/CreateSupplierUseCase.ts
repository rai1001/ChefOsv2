import { ISupplierRepository } from '../../domain/repositories/ISupplierRepository';
import { Supplier, PaymentTerm, SupplierCategory } from '../../domain/entities/Supplier';

export interface CreateSupplierDTO {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category: SupplierCategory[];
  paymentTerms: PaymentTerm;
}

export class CreateSupplierUseCase {
  constructor(private readonly repository: ISupplierRepository) {}

  async execute(dto: CreateSupplierDTO): Promise<Supplier> {
    if (!dto.name) {
      throw new Error('Supplier name is required');
    }

    const supplier: Supplier = {
      id: crypto.randomUUID(),
      organizationId: dto.organizationId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      category: dto.category,
      paymentTerms: dto.paymentTerms,
      isActive: true,
      rating: 0, // Initial rating
      createdAt: new Date(),
      updatedAt: new Date(),
      products: [],
    };

    await this.repository.save(supplier);
    return supplier;
  }
}

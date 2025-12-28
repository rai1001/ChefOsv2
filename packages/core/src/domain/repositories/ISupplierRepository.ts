import { Supplier } from '../entities/Supplier';

export interface ISupplierRepository {
  save(supplier: Supplier): Promise<void>;
  findById(id: string): Promise<Supplier | null>;
  findAll(organizationId: string): Promise<Supplier[]>;
  delete(id: string): Promise<void>;
}

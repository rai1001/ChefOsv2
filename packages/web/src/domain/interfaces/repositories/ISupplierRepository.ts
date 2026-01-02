import { Supplier } from '@/domain/entities/Supplier';

export interface ISupplierRepository {
  getSuppliers(outletId: string): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | null>;
  createSupplier(supplier: Supplier): Promise<void>;
  updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void>;
  deleteSupplier(id: string): Promise<void>;
  searchSuppliers(query: string, outletId: string): Promise<Supplier[]>;
  findOrCreateSupplier?(name: string, outletId: string): Promise<string>;
}

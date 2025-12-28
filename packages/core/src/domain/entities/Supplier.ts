import { Money } from '../value-objects/Money';

export enum PaymentTerm {
  IMMEDIATE = 'IMMEDIATE',
  NET_7 = 'NET_7',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_60 = 'NET_60',
}

export enum SupplierCategory {
  FOOD = 'FOOD',
  BEVERAGE = 'BEVERAGE',
  EQUIPMENT = 'EQUIPMENT',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

export interface SupplierProduct {
  productId: string; // SKU or internal ID
  name: string;
  price: Money;
  unit: string;
  sku?: string;
}

export interface Supplier {
  id: string;
  organizationId: string; // Multi-tenant support
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category: SupplierCategory[];
  paymentTerms: PaymentTerm;
  isActive: boolean;
  rating: number; // 1-5

  // Catalog
  products?: SupplierProduct[];

  createdAt: Date;
  updatedAt: Date;
}

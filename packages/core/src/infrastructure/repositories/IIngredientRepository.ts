import {
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
} from '../../domain/entities/Ingredient';
import { Quantity } from '../../domain/value-objects/Quantity';
import { RepositoryOptions } from './RepositoryOptions';

export interface IIngredientRepository {
  create(dto: CreateIngredientDTO, options?: RepositoryOptions): Promise<Ingredient>;
  findById(id: string, options?: RepositoryOptions): Promise<Ingredient | null>;
  findByOutletId(outletId: string): Promise<Ingredient[]>;
  findByCategory(outletId: string, category: string): Promise<Ingredient[]>;
  findLowStock(outletId: string): Promise<Ingredient[]>;
  update(id: string, dto: UpdateIngredientDTO, options?: RepositoryOptions): Promise<Ingredient>;
  delete(id: string, options?: RepositoryOptions): Promise<void>;
  search(outletId: string, query: string): Promise<Ingredient[]>;
  updateStock(id: string, quantityChange: Quantity): Promise<void>;
}

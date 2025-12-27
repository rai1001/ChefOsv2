import {
  StockTransaction,
  CreateStockTransactionDTO,
} from '../../domain/entities/StockTransaction';
import { RepositoryOptions } from './RepositoryOptions';

export interface IStockTransactionRepository {
  create(dto: CreateStockTransactionDTO, options?: RepositoryOptions): Promise<StockTransaction>;
  findById(id: string, options?: RepositoryOptions): Promise<StockTransaction | null>;
  findByIngredientId(
    ingredientId: string,
    limit?: number,
    options?: RepositoryOptions
  ): Promise<StockTransaction[]>;
  findByOutletId(
    outletId: string,
    limit?: number,
    options?: RepositoryOptions
  ): Promise<StockTransaction[]>;
}

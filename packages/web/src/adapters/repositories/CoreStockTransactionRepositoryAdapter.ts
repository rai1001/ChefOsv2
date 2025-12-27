import { injectable, inject } from 'inversify';
import { IStockTransactionRepository } from '@culinaryos/core';
import {
  StockTransaction as CoreStockTransaction,
  CreateStockTransactionDTO,
  StockTransactionType as CoreStockTransactionType,
} from '@culinaryos/core';
import { Quantity, Unit as CoreUnit, Money } from '@culinaryos/core';
import { IInventoryRepository as ILegacyInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import {
  StockTransaction as LegacyStockTransaction,
  StockTransactionType as LegacyStockTransactionType,
} from '@/domain/entities/StockTransaction';
import { TYPES } from '@/application/di/types';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class CoreStockTransactionRepositoryAdapter implements IStockTransactionRepository {
  constructor(@inject(TYPES.InventoryRepository) private legacyRepo: ILegacyInventoryRepository) {}

  async create(
    dto: CreateStockTransactionDTO,
    options?: { transaction?: any }
  ): Promise<CoreStockTransaction> {
    const transaction = new LegacyStockTransaction(
      uuidv4(),
      dto.ingredientId,
      dto.ingredientName,
      dto.quantity.value,
      dto.quantity.unit.toString() as any,
      this.toLegacyType(dto.type),
      new Date(),
      dto.performedBy,
      dto.unitCost.amount,
      dto.reason,
      dto.referenceId
    );

    await this.legacyRepo.addTransactionRecord(transaction, options);

    return {
      id: transaction.id,
      ...dto,
      date: transaction.date,
    };
  }

  async findById(_id: string): Promise<CoreStockTransaction | null> {
    // Legacy repository doesn't have findById for transactions
    throw new Error('Method not implemented.');
  }

  async findByIngredientId(ingredientId: string, limit?: number): Promise<CoreStockTransaction[]> {
    const legacies = await this.legacyRepo.getTransactionsByIngredient(ingredientId, limit);
    return legacies.map(this.toCore);
  }

  async findByOutletId(_outletId: string, _limit?: number): Promise<CoreStockTransaction[]> {
    // Legacy repository doesn't support global queries easily
    return [];
  }

  private toCore(legacy: LegacyStockTransaction): CoreStockTransaction {
    return {
      id: legacy.id,
      ingredientId: legacy.ingredientId,
      ingredientName: legacy.ingredientName,
      quantity: new Quantity(legacy.quantity, new CoreUnit(legacy.unit as any)),
      unitCost: Money.fromCents(legacy.costPerUnit * 100, 'EUR'), // Assuming EUR for now
      type: this.toCoreType(legacy.type),
      date: legacy.date,
      performedBy: legacy.performedBy,
      reason: legacy.reason,
      referenceId: legacy.batchId || legacy.orderId || legacy.relatedEntityId,
    };
  }

  private toCoreType(type: LegacyStockTransactionType): CoreStockTransactionType {
    switch (type) {
      case 'PURCHASE':
        return 'PURCHASE';
      case 'WASTE':
        return 'WASTE';
      case 'USAGE':
        return 'SALE';
      case 'AUDIT':
        return 'AUDIT';
      case 'ADJUSTMENT':
        return 'ADJUSTMENT';
      case 'INITIAL_STOCK':
        return 'INITIAL_STOCK';
      default:
        return 'ADJUSTMENT';
    }
  }

  private toLegacyType(type: CoreStockTransactionType): LegacyStockTransactionType {
    switch (type) {
      case 'PURCHASE':
        return 'PURCHASE';
      case 'WASTE':
        return 'WASTE';
      case 'SALE':
        return 'USAGE';
      case 'AUDIT':
        return 'AUDIT';
      case 'ADJUSTMENT':
        return 'ADJUSTMENT';
      case 'INITIAL_STOCK':
        return 'INITIAL_STOCK';
      case 'PRODUCTION':
        return 'USAGE'; // Production also uses USAGE in legacy
      default:
        return 'ADJUSTMENT';
    }
  }
}

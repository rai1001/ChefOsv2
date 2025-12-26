import { Quantity } from '../../domain/value-objects/Quantity';
import { CreateBatchDTO } from '../../domain/entities/Batch';
import { AddBatchUseCase } from './AddBatchUseCase';
import { ConsumeFIFOUseCase, ConsumeFIFODTO } from './ConsumeFIFOUseCase';
import { Money } from '../../domain/value-objects/Money';

export interface AdjustStockDTO {
  ingredientId: string;
  outletId: string; // Needed for creating batch
  adjustment: Quantity; // The amount to adjust BY. (Positive value always)
  type: 'increase' | 'decrease';
  reason: string;
  unitCost?: Money; // Required if increase
}

export class AdjustStockUseCase {
  constructor(
    private readonly addBatchUseCase: AddBatchUseCase,
    private readonly consumeFIFOUseCase: ConsumeFIFOUseCase
  ) {}

  async execute(dto: AdjustStockDTO): Promise<void> {
    if (dto.type === 'increase') {
      if (!dto.unitCost) {
        throw new Error('Unit cost is required for stock increase');
      }

      // Create an adjustment batch
      // We need lotNumber? Generate one 'ADJ-{Date}'
      const lotNumber = `ADJ-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 1000)}`;

      const createBatchDTO: CreateBatchDTO = {
        ingredientId: dto.ingredientId,
        outletId: dto.outletId,
        lotNumber: lotNumber,
        quantity: dto.adjustment,
        unitCost: dto.unitCost,
        supplier: 'Adjustment', // System
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default long expiry? Or required?
        // Ideally user provides expiry, but for adjustment often unknown.
        // Leaving generic.
        receivedDate: new Date(),
        notes: dto.reason,
      };

      await this.addBatchUseCase.execute(createBatchDTO);
    } else {
      // Decrease logic: Consume FIFO
      const consumeDTO: ConsumeFIFODTO = {
        ingredientId: dto.ingredientId,
        quantity: dto.adjustment,
        reason: dto.reason,
        reference: 'Stock Adjustment',
      };

      await this.consumeFIFOUseCase.execute(consumeDTO);
    }
  }
}

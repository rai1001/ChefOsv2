import { Ingredient as CoreIngredient } from '@culinaryos/core/dist/domain/entities/Ingredient';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { Money } from '@culinaryos/core/dist/domain/value-objects/Money';
import { Quantity } from '@culinaryos/core/dist/domain/value-objects/Quantity';
import { Unit } from '@culinaryos/core/dist/domain/value-objects/Unit';

export function toLegacy(core: CoreIngredient): LegacyIngredient {
    return new LegacyIngredient(
        core.id,
        core.name,
        core.unit as any, // TODO: Map types
        core.lastCost?.amount ?? 0,
        1, // yield default
        core.allergens || [],
        core.category as any, // TODO: Map types
        core.currentStock.value,
        core.minimumStock.value,
        undefined, // nutritionalInfo
        [], // batches
        core.supplier,
        [], // priceHistory
        undefined,
        undefined,
        core.outletId
    );
}

export function toCore(legacy: LegacyIngredient): CoreIngredient {
    return {
        id: legacy.id,
        outletId: legacy.outletId || '',
        name: legacy.name,
        category: legacy.category,
        unit: legacy.unit as string,
        currentStock: new Quantity(legacy.stock, new Unit(legacy.unit as any)), // TODO: safer unit parsing
        minimumStock: new Quantity(legacy.minStock, new Unit(legacy.unit as any)),
        lastCost: Money.fromCents(legacy.costPerUnit * 100),
        allergens: legacy.allergens,
        sku: legacy.defaultBarcode,
        createdAt: legacy.createdAt ? new Date(legacy.createdAt) : new Date(),
        updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(),
    };
}

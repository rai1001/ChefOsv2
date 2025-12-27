import {
  PurchaseOrder,
  CreatePurchaseOrderDTO,
  PurchaseOrderLine,
} from '../../domain/entities/PurchaseOrder';
import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { IIngredientRepository } from '../../infrastructure/repositories/IIngredientRepository';
import { IPurchaseOrderRepository } from '../../infrastructure/repositories/IPurchaseOrderRepository';
import { ITransactionManager } from '../../infrastructure/ITransactionManager';
import { Quantity } from '../../domain/value-objects/Quantity';

export interface GeneratePurchaseOrderInput {
  eventId: string;
  userId: string;
  supplier?: string;
  expectedDeliveryDate?: Date;
}

export interface IngredientRequirement {
  ingredientId: string;
  ingredientName: string;
  totalRequired: Quantity;
  currentStock: Quantity;
  toOrder: Quantity;
}

export interface GeneratePurchaseOrderResult {
  purchaseOrder: PurchaseOrder | null;
  requirements: IngredientRequirement[];
  warnings: string[];
}

/**
 * Use Case: Generar Purchase Order desde un Evento
 *
 * Calcula los ingredientes necesarios para un evento basándose en las fichas técnicas,
 * compara con el stock actual, y genera una orden de compra con lo que falta.
 */
export class GeneratePurchaseOrderFromEvent {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly fichaTecnicaRepository: IFichaTecnicaRepository,
    private readonly ingredientRepository: IIngredientRepository,
    private readonly purchaseOrderRepository: IPurchaseOrderRepository,
    private readonly transactionManager: ITransactionManager
  ) {}

  async execute(input: GeneratePurchaseOrderInput): Promise<GeneratePurchaseOrderResult> {
    const warnings: string[] = [];
    const requirements: IngredientRequirement[] = [];

    // 1. Obtener el evento
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) {
      throw new Error(`Event with ID ${input.eventId} not found`);
    }

    // 2. Calcular los ingredientes necesarios
    const ingredientMap = new Map<string, Quantity>();

    for (const menuItem of event.menu) {
      const ficha = await this.fichaTecnicaRepository.findById(menuItem.fichaId);
      if (!ficha) {
        warnings.push(`Recipe ${menuItem.fichaName} not found`);
        continue;
      }

      // Multiplicar las cantidades de ingredientes por la cantidad de veces que se ejecuta la receta
      const scaleFactor = menuItem.quantity;

      for (const recipeIngredient of ficha.ingredients) {
        const existingQuantity = ingredientMap.get(recipeIngredient.ingredientId);
        const scaledQuantity = recipeIngredient.quantity.multiply(scaleFactor);

        if (existingQuantity) {
          ingredientMap.set(recipeIngredient.ingredientId, existingQuantity.add(scaledQuantity));
        } else {
          ingredientMap.set(recipeIngredient.ingredientId, scaledQuantity);
        }
      }
    }

    // 3. Comparar con stock actual y determinar qué ordenar
    const purchaseOrderLines: PurchaseOrderLine[] = [];

    for (const [ingredientId, totalRequired] of ingredientMap.entries()) {
      const ingredient = await this.ingredientRepository.findById(ingredientId);
      if (!ingredient) {
        warnings.push(`Ingredient with ID ${ingredientId} not found`);
        continue;
      }

      const currentStock = ingredient.currentStock;
      const toOrder = totalRequired.subtract(currentStock);

      requirements.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        totalRequired,
        currentStock,
        toOrder: toOrder.value > 0 ? toOrder : new Quantity(0, toOrder.unit),
      });

      // Solo agregar a la orden si necesitamos ordenar más
      if (toOrder.value > 0) {
        purchaseOrderLines.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          quantity: toOrder,
          unitCost: ingredient.lastCost,
          totalCost: ingredient.lastCost ? ingredient.lastCost.multiply(toOrder.value) : undefined,
        });
      }
    }

    // 4. Si no hay nada que ordenar, retornar sin crear PO
    if (purchaseOrderLines.length === 0) {
      warnings.push('All required ingredients are in stock. No purchase order needed.');
      return {
        purchaseOrder: null,
        requirements,
        warnings,
      };
    }

    // 5. Crear la Purchase Order
    const purchaseOrder = await this.transactionManager.runTransaction(async (_transaction) => {
      const poDTO: CreatePurchaseOrderDTO = {
        outletId: event.outletId,
        supplier: input.supplier || 'TBD',
        lines: purchaseOrderLines.map((line) => ({
          ingredientId: line.ingredientId,
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
        expectedDeliveryDate: input.expectedDeliveryDate || event.eventDate,
        notes: `Auto-generated for event: ${event.eventName} (${event.eventDate.toLocaleDateString()})`,
        isAutoGenerated: true,
      };

      return this.purchaseOrderRepository.create(poDTO);
    });

    return {
      purchaseOrder,
      requirements,
      warnings,
    };
  }
}

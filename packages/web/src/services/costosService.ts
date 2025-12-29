/**
 * @file src/services/costosService.ts
 * @description Service for automatic cost calculation of Fichas Técnicas.
 */

import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import { convertUnit } from '@/utils/unitConverter';
import { calcularCostoIngrediente, calcularSugerenciaPrecio } from '@/utils/precioCalculator';
import type { CreateFichaDTO, FichaTecnica, Ingredient, Unit } from '@/types';
import { where, documentId } from 'firebase/firestore';
import { collections } from '@/config/collections';

export type EstrategiaCosto = 'ultima_compra' | 'costo_actual' | 'costo_estandar';

/**
 * Gets the unit cost of an ingredient from the inventory.
 */
export async function obtenerCostoIndividual(
  ingredienteId: string,
  _estrategia: EstrategiaCosto = 'costo_actual'
): Promise<{ costo: number; unidad: Unit; yield: number; nombre: string }> {
  const ingredient = await firestoreService.getById<Ingredient>(
    COLLECTIONS.INGREDIENTS,
    ingredienteId
  );

  if (!ingredient) {
    throw new Error(`Ingredient not found: ${ingredienteId}`);
  }

  // For now, we use the costPerUnit from the ingredient record which should be updated by purchasing/reception
  return {
    costo: ingredient.costPerUnit || 0,
    unidad: ingredient.unit as Unit,
    yield: ingredient.yield || 1,
    nombre: ingredient.name,
  };
}

/**
 * Calculates all costs for a Ficha Técnica DTO.
 */
export async function calcularCostosFicha(
  data: Partial<CreateFichaDTO>
): Promise<FichaTecnica['costos']> {
  let costoIngredientes = 0;

  if (data.ingredientes && data.ingredientes.length > 0) {
    // Collect IDs to fetch in batch (optimize N+1)
    const ingredientIds = [...new Set(data.ingredientes.map((i) => i.ingredienteId))];
    const ingredientsMap = new Map<string, Ingredient>();

    // Firestore 'in' limit is 10. Split into chunks if necessary.
    const chunks = [];
    for (let i = 0; i < ingredientIds.length; i += 10) {
      chunks.push(ingredientIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      try {
        // If using 'documentId()', ensure we cast it correctly if needed by the query helper
        // Assuming firestoreService.query handles this, or we use raw query
        const results = await firestoreService.query<Ingredient>(
          collections.ingredients as any,
          {},
          where(documentId(), 'in', chunk)
        );
        results.forEach((ing) => ingredientsMap.set(ing.id, ing));
      } catch (e) {
        console.error('Error batch fetching ingredients:', e);
        // Fallback: try fetching individually if batch fails? Or just continue.
      }
    }

    // If map is empty (maybe 'in' query failed or mocked environment), try falling back to individual get for tests/mocks
    if (ingredientsMap.size === 0 && ingredientIds.length > 0) {
      for (const id of ingredientIds) {
        try {
          const ing = await firestoreService.getById<Ingredient>(COLLECTIONS.INGREDIENTS, id);
          if (ing) ingredientsMap.set(id, ing);
        } catch (e) {
          // ignore error for individual fetch fallback
        }
      }
    }

    for (const item of data.ingredientes) {
      const ingredient = ingredientsMap.get(item.ingredienteId);

      if (ingredient) {
        // Convert recipe unit to inventory unit if they differ
        const cantidadEnUnidadBase = convertUnit(item.cantidad, item.unidad, ingredient.unit);

        // Calculate cost accounting for yield
        const costoItem = calcularCostoIngrediente(
          cantidadEnUnidadBase,
          ingredient.costPerUnit || 0,
          ingredient.yield || 1
        );

        // Update item with denormalized cost info for history/UI
        item.costoUnitario = ingredient.costPerUnit || 0;
        item.costoTotal = Number(costoItem.toFixed(4));
        item.nombre = ingredient.name;

        costoIngredientes += costoItem;
      } else {
        console.warn(`Ingredient ${item.ingredienteId} not found during cost calculation`);
      }
    }
  }

  const porciones = data.porciones || 1;
  const manoObra = data.costos?.manoObra || 0;
  const energia = data.costos?.energia || 0;
  const total = costoIngredientes + manoObra + energia;

  return {
    ingredientes: Number(costoIngredientes.toFixed(2)),
    manoObra,
    energia,
    total: Number(total.toFixed(2)),
    porPorcion: Number((total / porciones).toFixed(2)),
  };
}

/**
 * Recalculates costs for an existing Ficha.
 * Useful when ingredient prices change.
 */
export async function recalcularFicha(ficha: FichaTecnica): Promise<FichaTecnica> {
  const nuevosCostos = await calcularCostosFicha(ficha);

  // Optionally update pricing suggestion if auto-pricing is enabled
  const pricing = ficha.pricing.margenBruto
    ? {
        ...ficha.pricing,
        ...calcularSugerenciaPrecio(
          nuevosCostos.porPorcion,
          (ficha.pricing.margenBruto / (ficha.pricing.precioVentaSugerido || 1)) * 100
        ),
      }
    : ficha.pricing;

  return {
    ...ficha,
    costos: nuevosCostos,
    pricing,
  };
}

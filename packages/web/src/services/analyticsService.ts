/**
 * @file src/services/analyticsService.ts
 * @description Service for analyzing Ficha Técnica profitability and calculating metrics.
 */

import type { FichaTecnica, Event, Menu, Recipe, Ingredient, MenuItemAnalytics } from '@/types';
// import { httpsCallable } from 'firebase/functions';

export interface Optimizacion {
  tipo: 'ingrediente_caro' | 'margen_bajo' | 'porcion_grande' | 'desperdicio_alto';
  descripcion: string;
  impactoEstimado: number;
  sugerencia: string;
  prioridad: 'high' | 'medium' | 'low';
}

export interface CambiosEscenario {
  ingredientes?: { id: string; nuevoPrecio: number }[];
  porciones?: number;
  margenDeseado?: number;
}

export interface ResultadoSimulacion {
  costoOriginal: number;
  costoNuevo: number;
  diferenciaCosto: number;
  precioOriginal: number;
  precioNuevo: number;
  diferenciaPrecio: number;
  impactoMargen: number;
}

export interface AnalisisPlato {
  fichaId: string;
  nombre: string;
  costoIngredientes: number;
  costoPorcentajeIngredientes: number;
  ingredienteMasCaro: {
    nombre: string;
    costo: number;
    porcentaje: number;
  };
  costoPromedioCategoria: number;
  posicionEnCategoria: number;
  totalEnCategoria: number;
  margen: number;
  margenVsPromedio: number;
  optimizaciones: Optimizacion[];
}

export interface GlobalMetrics {
  totalFichas: number;
  costoPromedio: number;
  margenPromedio: number;
  masRentable: FichaTecnica | null;
}

/**
 * Calculates global metrics for a list of technical sheets.
 */
export function calculateGlobalMetrics(fichas: FichaTecnica[]): GlobalMetrics {
  if (fichas.length === 0) {
    return { totalFichas: 0, costoPromedio: 0, margenPromedio: 0, masRentable: null };
  }

  const total = fichas.length;
  const avgCost = fichas.reduce((acc, f) => acc + f.costos.porPorcion, 0) / total;
  const avgMargin = fichas.reduce((acc, f) => acc + (f.pricing.margenBruto || 0), 0) / total;

  const masRentable = [...fichas].sort(
    (a, b) => (b.pricing.margenBruto || 0) - (a.pricing.margenBruto || 0)
  )[0];

  return {
    totalFichas: total,
    costoPromedio: avgCost,
    margenPromedio: avgMargin,
    masRentable: masRentable || null,
  };
}

/**
 * Detects potential optimizations for a given recipe.
 */
export function detectarOptimizaciones(
  ficha: FichaTecnica,
  fichasCategoria: FichaTecnica[]
): Optimizacion[] {
  const optimizaciones: Optimizacion[] = [];

  // 1. Ingrediente muy caro (>60% of cost)
  if (!ficha.ingredientes || ficha.ingredientes.length === 0) {
    return optimizaciones;
  }

  const ingredienteMasCaro = ficha.ingredientes.reduce(
    (max, ing) => ((ing?.costoTotal || 0) > (max?.costoTotal || 0) ? ing : max),
    ficha.ingredientes[0]
  );

  if (ingredienteMasCaro && ingredienteMasCaro.costoTotal / ficha.costos.ingredientes > 0.6) {
    optimizaciones.push({
      tipo: 'ingrediente_caro',
      descripcion: `${ingredienteMasCaro.nombre} representa ${((ingredienteMasCaro.costoTotal / ficha.costos.ingredientes) * 100).toFixed(0)}% del costo total`,
      impactoEstimado: ingredienteMasCaro.costoTotal * 0.2,
      sugerencia: `Considera reducir la cantidad de ${ingredienteMasCaro.nombre} o buscar alternativa más económica`,
      prioridad: 'high',
    });
  }

  // 2. Margen bajo comparado con categoría
  const margenPromedio =
    fichasCategoria.length > 0
      ? fichasCategoria.reduce((acc, f) => acc + (f.pricing.margenBruto || 0), 0) /
        fichasCategoria.length
      : 0;

  if ((ficha.pricing.margenBruto || 0) < margenPromedio - 10) {
    optimizaciones.push({
      tipo: 'margen_bajo',
      descripcion: `Margen ${ficha.pricing.margenBruto}% está ${(margenPromedio - (ficha.pricing.margenBruto || 0)).toFixed(0)}% por debajo del promedio de la categoría`,
      impactoEstimado:
        ((margenPromedio - (ficha.pricing.margenBruto || 0)) *
          (ficha.pricing.precioVentaSugerido || 0)) /
        100,
      sugerencia: `Considera aumentar precio de venta o reducir costos`,
      prioridad: 'medium',
    });
  }

  // 3. Porciones grandes
  if (ficha.porciones > 8) {
    const costoSiReduce = ficha.costos.total * (6 / ficha.porciones);
    optimizaciones.push({
      tipo: 'porcion_grande',
      descripcion: `Produce ${ficha.porciones} porciones, superior al estándar`,
      impactoEstimado: ficha.costos.total - costoSiReduce,
      sugerencia: `Ajustar a 6 porciones reduciría costo total de producción`,
      prioridad: 'low',
    });
  }

  return optimizaciones;
}

/**
 * Simulates a pricing/cost scenario.
 */
export function simularEscenario(
  ficha: FichaTecnica,
  cambios: CambiosEscenario
): ResultadoSimulacion {
  let nuevosCostos = ficha.costos.ingredientes;

  // Apply ingredient price changes
  if (cambios.ingredientes) {
    cambios.ingredientes.forEach(({ id, nuevoPrecio }) => {
      const ing = ficha.ingredientes.find((i) => i.ingredienteId === id);
      if (ing) {
        const diferencia = nuevoPrecio - ing.costoUnitario;
        nuevosCostos += diferencia * ing.cantidad;
      }
    });
  }

  // Apply portion change
  // Note: Cost PER PORTION changes if portions change but total ingredients stay same?
  // Usually "portions" change means "yield" changes for same ingredients.
  const nuevasPorciones = cambios.porciones || ficha.porciones;

  // Total cost isn't changing just by changing yield number, but cost per portion dies.
  // Unless we assume new cost is scaled? No, simulation usually means "what if this batch yields X instead of Y"

  // However, if we change INGREDIENTS prices, total cost changes.
  // So new total cost = nuevosCostos (calculated above)

  const nuevoCostoPorPorcion = nuevosCostos / nuevasPorciones;
  const nuevoMargen =
    cambios.margenDeseado !== undefined ? cambios.margenDeseado : ficha.pricing.margenBruto || 0;

  // Calculate new suggested price to maintain margin
  // Price = Cost / (1 - Margin%)
  // Margin is usually entered as 30 for 30%.
  const nuevoPrecio = nuevoCostoPorPorcion / (1 - nuevoMargen / 100);

  return {
    costoOriginal: ficha.costos.porPorcion || 0,
    costoNuevo: nuevoCostoPorPorcion,
    diferenciaCosto: nuevoCostoPorPorcion - (ficha.costos.porPorcion || 0),
    precioOriginal: ficha.pricing.precioVentaSugerido || 0,
    precioNuevo: nuevoPrecio,
    diferenciaPrecio: nuevoPrecio - (ficha.pricing.precioVentaSugerido || 0),
    impactoMargen: nuevoMargen - (ficha.pricing.margenBruto || 0),
  };
}

/**
 * Detailed analytics for a single sheet.
 */
export function analizarFicha(ficha: FichaTecnica, fichasCategoria: FichaTecnica[]): AnalisisPlato {
  const ingredienteMasCaro =
    ficha.ingredientes && ficha.ingredientes.length > 0
      ? ficha.ingredientes.reduce(
          (max, ing) => ((ing?.costoTotal || 0) > (max?.costoTotal || 0) ? ing : max),
          ficha.ingredientes[0]
        )
      : null;

  const costoPromedioCategoria =
    fichasCategoria.length > 0
      ? fichasCategoria.reduce((acc, f) => acc + f.costos.porPorcion, 0) / fichasCategoria.length
      : 0;

  const fichasOrdenadas = [...fichasCategoria].sort(
    (a, b) => a.costos.porPorcion - b.costos.porPorcion
  );
  const posicion = fichasOrdenadas.findIndex((f) => f.id === ficha.id) + 1;

  return {
    fichaId: ficha.id,
    nombre: ficha.nombre,
    costoIngredientes: ficha.costos.ingredientes,
    costoPorcentajeIngredientes: (ficha.costos.ingredientes / (ficha.costos.total || 1)) * 100,
    ingredienteMasCaro: {
      nombre: ingredienteMasCaro?.nombre || 'N/A',
      costo: ingredienteMasCaro?.costoTotal || 0,
      porcentaje: ingredienteMasCaro
        ? (ingredienteMasCaro.costoTotal / (ficha.costos.ingredientes || 1)) * 100
        : 0,
    },
    costoPromedioCategoria,
    posicionEnCategoria: posicion,
    totalEnCategoria: fichasCategoria.length,
    margen: ficha.pricing.margenBruto || 0,
    margenVsPromedio:
      (ficha.pricing.margenBruto || 0) -
      fichasCategoria.reduce((acc, f) => acc + (f.pricing.margenBruto || 0), 0) /
        (fichasCategoria.length || 1),
    optimizaciones: detectarOptimizaciones(ficha, fichasCategoria),
  };
}

/**
 * Calculates menu engineering analytics based on events and dishes.
 */
/**
 * Calculates menu engineering analytics based on events and dishes.
 * Migrated to Cloud Functions for performance.
 */

/**
 * Calculates menu engineering analytics based on events and dishes.
 * Migrated to Cloud Functions for performance.
 */
// import { functions } from '@/config/firebase';

/**
 * Calculates menu engineering analytics based on events and dishes.
 * Migrated to Cloud Functions for performance.
 */
export async function calculateIngredientUsage(
  _events: Event[],
  _menus: Menu[],
  _recipes: Recipe[],
  _ingredients: Ingredient[],
  startDate: string,
  endDate: string,
  outletId?: string
): Promise<MenuItemAnalytics[]> {
  console.warn('Analytics temporarily disabled during migration.');
  return [];
  /*
  try {
    const getMenuAnalytics = httpsCallable(functions, 'getMenuAnalytics');
    const result = await getMenuAnalytics({ startDate, endDate, outletId });
    return result.data as MenuItemAnalytics[];
  } catch (error) {
    console.error('Error calling getMenuAnalytics cloud function:', error);
    return [];
  }
  */
}

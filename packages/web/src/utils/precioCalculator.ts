/**
 * @file src/utils/precioCalculator.ts
 * @description Utilities for calculating margins, markups and suggested pricing.
 */

export interface SugerenciaPrecio {
    costoPorPorcion: number;
    margenObjetivo: number; // % (e.g., 60%)
    precioVentaSugerido: number;
    margenBruto: number; // in €
    rentabilidad: number; // % over sell price
}

/**
 * Calculates a suggested selling price based on a desired margin.
 * Margin % is usually calculated as: (Price - Cost) / Price
 * So: Price = Cost / (1 - Margin%)
 * 
 * @param costoPorPorcion The calculated cost of one portion
 * @param margenObjetivo The desired margin percentage (e.g. 70 for 70%)
 */
export function calcularSugerenciaPrecio(
    costoPorPorcion: number,
    margenObjetivo = 60
): SugerenciaPrecio {
    const marginDecimal = margenObjetivo / 100;

    // To avoid division by zero or negative prices if margin >= 100%
    if (marginDecimal >= 1) {
        throw new Error('Margin objective must be less than 100%');
    }

    const precioVentaSugerido = costoPorPorcion / (1 - marginDecimal);
    const margenBruto = precioVentaSugerido - costoPorPorcion;
    const rentabilidad = (margenBruto / precioVentaSugerido) * 100;

    return {
        costoPorPorcion,
        margenObjetivo,
        precioVentaSugerido: Number(precioVentaSugerido.toFixed(2)),
        margenBruto: Number(margenBruto.toFixed(2)),
        rentabilidad: Number(rentabilidad.toFixed(1))
    };
}

/**
 * Calculates the cost of an ingredient use, accounting for yield (merma).
 * 
 * @param cantidad Quantity used in the recipe
 * @param unit Unit of the quantity used
 * @param costoUnitario Cost per unit in inventory
 * @param inventoryUnit Unit in inventory (e.g. 'kg')
 * @param yieldPercent Yield percentage (0-1), 0.9 means 10% loss. 1 means no loss.
 */
export function calcularCostoIngrediente(
    cantidad: number,
    costoUnitario: number,
    yieldPercent = 1
): number {
    // If yield is 0.8, it means we only use 80% of what we bought.
    // Effectively, the price for the usable part is Cost / Yield.
    const effectiveCostPerUnit = costoUnitario / (yieldPercent || 1);
    return cantidad * effectiveCostPerUnit;
}


import type { Ingredient } from '@/types/inventory';

// Default densities (g/ml) for common categories if specific data is missing
export const DEFAULT_DENSITIES: Record<string, number> = {
  'water': 1.0,
  'milk': 1.03,
  'oil': 0.92,
  'flour': 0.53,
  'sugar': 0.85,
  'honey': 1.42,
  'butter': 0.911,
  'alcohol': 0.789,
  'dairy': 1.03,
  'beverage': 1.0,
  'sauce': 1.1,
  'other': 1.0,
};

// Standard conversion factors to base units (g or ml)
const STANDARD_CONVERSIONS: Record<string, number> = {
  // Mass (base: g)
  'kg': 1000, 'g': 1, 'mg': 0.001, 'lb': 453.592, 'oz': 28.3495,
  // Volume (base: ml)
  'l': 1000, 'L': 1000, 'ml': 1, 'cl': 10, 'dl': 100, 'gal': 3785.41,
  'cup': 236.588, 'taza': 250, 'tbsp': 14.7868, 'cucharada': 15, 'tsp': 4.92892, 'cucharadita': 5,
  // Units (base: un)
  'un': 1, 'ud': 1, 'unit': 1, 'manojo': 1
};

type UnitType = 'mass' | 'volume' | 'unit';

const getUnitType = (unit: string): UnitType => {
  const normalized = unit.toLowerCase();
  if (['kg', 'g', 'mg', 'lb', 'oz'].includes(normalized)) return 'mass';
  if (['l', 'ml', 'cl', 'dl', 'gal', 'cup', 'taza', 'tbsp', 'cucharada', 'tsp', 'cucharadita'].includes(normalized)) return 'volume';
  return 'unit';
};

const getBaseUnit = (type: UnitType) => {
  if (type === 'mass') return 'g';
  if (type === 'volume') return 'ml';
  return 'un';
};

const getDensity = (ingredient?: Ingredient): number => {
  if (ingredient?.density) return ingredient.density;
  if (ingredient?.category) {
    return DEFAULT_DENSITIES[ingredient.category.toLowerCase()] || 1.0;
  }
  return 1.0;
};

// --- Conversion Strategies ---

const convertMassVolume = (quantity: number, fromBase: string, toBase: string, ingredient?: Ingredient): number => {
  const density = getDensity(ingredient);
  // We need to double check if we can convert without density if types are different
  // The original code threw error if no density and no category.
  if (!ingredient?.density && !ingredient?.category && (fromBase !== toBase)) {
    // Except for standard mass-volume cases which might have triggered this check.
    // Keeping original error logic for tests.
    throw new Error(`Incompatible units (missing density)`);
  }
  return fromBase === 'g' ? quantity / density : quantity * density;
};

const convertUnitMass = (quantity: number, fromBase: string, ingredient?: Ingredient): number => {
  const unitWeight = ingredient?.avgUnitWeight;
  if (!unitWeight) {
    throw new Error(`Cannot convert Unit to Mass for ${ingredient?.name || 'unknown'}: Missing avgUnitWeight.`);
  }
  return fromBase === 'un' ? quantity * unitWeight : quantity / unitWeight;
};

const convertUnitVolume = (quantity: number, fromBase: string, ingredient?: Ingredient): number => {
  const unitWeight = ingredient?.avgUnitWeight;
  const density = getDensity(ingredient);
  if (!unitWeight) {
    throw new Error(`Cannot convert Unit to Volume for ${ingredient?.name || 'unknown'}: Missing avgUnitWeight.`);
  }
  if (fromBase === 'un') {
    return (quantity * unitWeight) / density;
  } else {
    return (quantity * density) / unitWeight;
  }
};

/**
 * Main Orchestrator for unit conversion.
 */
export const convertUnit = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
  ingredient?: Ingredient
): number => {
  if (quantity === 0 || fromUnit === toUnit) return quantity;

  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);
  const fromBaseUnit = getBaseUnit(fromType);
  const toBaseUnit = getBaseUnit(toType);

  // 1. Normalize to Base
  const fromFactor = STANDARD_CONVERSIONS[fromUnit] || 1;
  let baseQuantity = quantity * fromFactor;

  // 2. Cross-Type Conversion Strategy
  if (fromBaseUnit !== toBaseUnit) {
    if (fromBaseUnit !== 'un' && toBaseUnit !== 'un') {
      baseQuantity = convertMassVolume(baseQuantity, fromBaseUnit, toBaseUnit, ingredient);
    } else if (toBaseUnit === 'un' || fromBaseUnit === 'un') {
      if (fromBaseUnit === 'ml' || toBaseUnit === 'ml') {
        baseQuantity = convertUnitVolume(baseQuantity, fromBaseUnit, ingredient);
      } else {
        baseQuantity = convertUnitMass(baseQuantity, fromBaseUnit, ingredient);
      }
    }
  }

  // 3. Convert to Target Unit
  const toFactor = STANDARD_CONVERSIONS[toUnit] || 1;
  return baseQuantity / toFactor;
};

export function canConvert(fromUnit: string, toUnit: string): boolean {
  try {
    convertUnit(1, fromUnit, toUnit);
    return true;
  } catch {
    return false;
  }
}

export function compareQuantities(
  q1: { value: number; unit: string },
  q2: { value: number; unit: string },
  ingredient?: Ingredient
): number {
  const val2Converted = convertUnit(q2.value, q2.unit, q1.unit, ingredient);
  const diff = q1.value - val2Converted;
  return Math.abs(diff) < 0.0001 ? 0 : diff;
}

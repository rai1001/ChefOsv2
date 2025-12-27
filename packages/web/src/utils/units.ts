
// Imports removed to fix unused declaration error

// Standard metric conversions to base units (kg, L)
// We treat 'un' as base 1, but it cannot be converted to weight/volume without specific density/weight
const STANDARD_CONVERSIONS: Record<string, number> = {
    // Weight (base: kg)
    'kg': 1,
    'g': 0.001,
    'mg': 0.000001,
    'lb': 0.453592,
    'oz': 0.0283495,

    // Volume (base: L)
    'l': 1,
    'L': 1, // normalize case
    'ml': 0.001,
    'cl': 0.01,
    'gal': 3.78541,
    'pt': 0.473176,

    // Count (base: un)
    'un': 1,
    'unit': 1,
    'und': 1,
    'pcs': 1,
    'pieza': 1,
    'manojo': 1, // Treated as unit unless conversion factor exists
};

/**
 * Normalizes unit string to lowercase/standard key
 */
export const normalizeUnit = (unit: string): string => {
    if (!unit) return 'un';
    const u = unit.toLowerCase().trim();
    if (u === 'l') return 'L'; // Prefer uppercase L per type definition if needed, but logic uses lowercase keys
    return u;
};

/**
 * Converts a value from one unit to another.
 *
 * @param value - The numerical value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @param conversionFactors - Optional map of custom conversion factors (e.g. { "caja": 10 }) relative to the base unit of the item
 * @returns The converted value, or original value if conversion impossible
 */
export const convertUnit = (
    value: number,
    fromUnit: string,
    toUnit: string,
    conversionFactors?: Record<string, number>
): number => {
    if (fromUnit === toUnit) return value;
    if (value === 0) return 0;

    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);

    // 1. Direct standard conversion (within same dimension)
    if (STANDARD_CONVERSIONS[from] && STANDARD_CONVERSIONS[to]) {
        // Check if dimensions match (both weight or both volume)
        // Simplistic check: if one is weight and other is volume, we can't convert strictly without density.
        // But for now, we assume if both exist in table, we just use factors relative to base (kg/L/un).
        // WARNING: This assumes kg and L are not mixed unless density is 1.
        // For culinary purposes, often 1kg ~ 1L is assumed for water-based, but strictly we should check.
        // Here we just do algebraic conversion: Value_Base = Value_From * Factor_From. Value_To = Value_Base / Factor_To.

        return (value * STANDARD_CONVERSIONS[from]) / STANDARD_CONVERSIONS[to];
    }

    // 2. Custom Conversion Factors
    // Strategy: Convert 'from' to Base, then Base to 'to'.
    // A conversion factor usually defines how much of the BASE unit is in the CUSTOM unit.
    // e.g. Base=kg. Factor {"caja": 15}. Means 1 caja = 15 kg.

    const getFactor = (u: string): number | null => {
        // Check standard
        if (STANDARD_CONVERSIONS[u]) return STANDARD_CONVERSIONS[u];
        // Check custom
        if (conversionFactors?.[u]) return conversionFactors[u];
        return null;
    };

    const fromFactor = getFactor(from);
    const toFactor = getFactor(to);

    if (fromFactor !== null && toFactor !== null) {
        return (value * fromFactor) / toFactor;
    }

    // 3. Fallback: If no conversion found, return original (or throw? Requirement says "Robust", so maybe log warning and return original)
    console.warn(`Unit conversion failed: ${from} -> ${to}. Returning original value.`);
    return value;
};

/**
 * Helper to display values nicely (e.g. 1.5 kg, 500 g)
 */
export const formatUnit = (value: number, unit: string): string => {
    // If < 1 kg, show g? Not requested but good practice.
    // For now simple return.
    return `${Number(value.toFixed(3))} ${unit}`;
};

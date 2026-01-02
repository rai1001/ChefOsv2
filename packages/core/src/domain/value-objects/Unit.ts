/**
 * Unidades de medida soportadas
 */
export enum UnitType {
  // Masa
  KG = 'kg',
  G = 'g',
  MG = 'mg',
  LB = 'lb',
  OZ = 'oz',

  // Volumen
  L = 'L',
  ML = 'ml',
  GAL = 'gal',
  QT = 'qt',
  PT = 'pt',
  CUP = 'cup',
  TBSP = 'tbsp',
  TSP = 'tsp',

  // Unidades
  UNIT = 'ud',
}

/**
 * Tabla de conversión a unidades base (kg para masa, L para volumen)
 */
const CONVERSION_TO_BASE: Record<UnitType, number> = {
  // Masa (base: kg)
  [UnitType.KG]: 1,
  [UnitType.G]: 0.001,
  [UnitType.MG]: 0.000001,
  [UnitType.LB]: 0.453592,
  [UnitType.OZ]: 0.0283495,

  // Volumen (base: L)
  [UnitType.L]: 1,
  [UnitType.ML]: 0.001,
  [UnitType.GAL]: 3.78541,
  [UnitType.QT]: 0.946353,
  [UnitType.PT]: 0.473176,
  [UnitType.CUP]: 0.236588,
  [UnitType.TBSP]: 0.0147868,
  [UnitType.TSP]: 0.00492892,

  // Unidades (no convertible)
  [UnitType.UNIT]: 1,
};

/**
 * Categorías de unidades para validar conversiones
 */
enum UnitCategory {
  MASS = 'mass',
  VOLUME = 'volume',
  UNIT = 'unit',
}

const UNIT_CATEGORIES: Record<UnitType, UnitCategory> = {
  [UnitType.KG]: UnitCategory.MASS,
  [UnitType.G]: UnitCategory.MASS,
  [UnitType.MG]: UnitCategory.MASS,
  [UnitType.LB]: UnitCategory.MASS,
  [UnitType.OZ]: UnitCategory.MASS,

  [UnitType.L]: UnitCategory.VOLUME,
  [UnitType.ML]: UnitCategory.VOLUME,
  [UnitType.GAL]: UnitCategory.VOLUME,
  [UnitType.QT]: UnitCategory.VOLUME,
  [UnitType.PT]: UnitCategory.VOLUME,
  [UnitType.CUP]: UnitCategory.VOLUME,
  [UnitType.TBSP]: UnitCategory.VOLUME,
  [UnitType.TSP]: UnitCategory.VOLUME,

  [UnitType.UNIT]: UnitCategory.UNIT,
};

/**
 * Contexto necesario para conversiones entre diferentes categorías
 */
export interface ConversionContext {
  density?: number; // g/ml
  pieceWeight?: number; // g por pieza
}

/**
 * Sistema de conversión de unidades
 */
export class Unit {
  constructor(public readonly type: UnitType) {}

  /**
   * Crea una unidad desde un string
   */
  static from(value: string): Unit {
    // Normalize Spanish variations
    const normalized = value.toLowerCase().trim();
    const mappings: Record<string, UnitType> = {
      ud: UnitType.UNIT,
      un: UnitType.UNIT,
      unidad: UnitType.UNIT,
      unidades: UnitType.UNIT,
      kg: UnitType.KG,
      kilo: UnitType.KG,
      kilogramo: UnitType.KG,
      g: UnitType.G,
      gramo: UnitType.G,
      l: UnitType.L,
      litro: UnitType.L,
      ml: UnitType.ML,
      mililitro: UnitType.ML,
    };

    const mapped = mappings[normalized];
    if (mapped) return new Unit(mapped);

    const unitType = Object.values(UnitType).find((u) => u === value);
    if (!unitType) {
      // Return default unit instead of throwing if we want to be resilient in UI
      console.warn(`Invalid unit type encountered: ${value}, defaulting to UnitType.UNIT`);
      return new Unit(UnitType.UNIT);
    }
    return new Unit(unitType as UnitType);
  }

  /**
   * Convierte una cantidad de esta unidad a otra unidad
   */
  convert(amount: number, toUnit: Unit, context?: ConversionContext): number {
    if (this.type === toUnit.type) {
      return amount;
    }

    const fromCategory = UNIT_CATEGORIES[this.type];
    const toCategory = UNIT_CATEGORIES[toUnit.type];

    // Caso 1: Misma categoría (Masa -> Masa o Volumen -> Volumen)
    if (fromCategory === toCategory && fromCategory !== UnitCategory.UNIT) {
      const baseAmount = amount * CONVERSION_TO_BASE[this.type];
      return baseAmount / CONVERSION_TO_BASE[toUnit.type];
    }

    // Caso 2: Masa <-> Volumen (Requiere densidad)
    if (
      (fromCategory === UnitCategory.MASS && toCategory === UnitCategory.VOLUME) ||
      (fromCategory === UnitCategory.VOLUME && toCategory === UnitCategory.MASS)
    ) {
      if (!context?.density) {
        throw new Error(`Density is required to convert between ${fromCategory} and ${toCategory}`);
      }

      // 1. Convertir a unidad base técnica (g para masa, ml para volumen)
      // La base de Unit es kg y L, así que multiplicamos por 1000 para llegar a g y ml
      const amountInBaseTech = amount * CONVERSION_TO_BASE[this.type] * 1000;

      let resultInBaseTech: number;
      if (fromCategory === UnitCategory.MASS) {
        // g -> ml (g / (g/ml))
        resultInBaseTech = amountInBaseTech / context.density;
      } else {
        // ml -> g (ml * (g/ml))
        resultInBaseTech = amountInBaseTech * context.density;
      }

      // 2. Convertir de base técnica a la unidad objetivo
      // (resultInBaseTech / 1000) nos da el valor en la base original (kg o L)
      return resultInBaseTech / 1000 / CONVERSION_TO_BASE[toUnit.type];
    }

    // Caso 3: Unit (ud) <-> Masa/Volumen (Requiere pieceWeight)
    if (fromCategory === UnitCategory.UNIT || toCategory === UnitCategory.UNIT) {
      if (!context?.pieceWeight) {
        throw new Error(
          `Piece weight is required to convert between ${fromCategory} and ${toCategory}`
        );
      }

      if (fromCategory === UnitCategory.UNIT) {
        // ud -> Masa/Volumen
        // 1. ud -> g (ud * g/ud)
        const grams = amount * context.pieceWeight;
        // 2. g -> Destino
        const gUnit = new Unit(UnitType.G);
        return gUnit.convert(grams, toUnit, context);
      } else {
        // Masa/Volumen -> ud
        // 1. Origen -> g
        const gUnit = new Unit(UnitType.G);
        const grams = this.convert(amount, gUnit, context);
        // 2. g -> ud (g / (g/ud))
        return grams / context.pieceWeight;
      }
    }

    throw new Error(
      `Cannot convert between different unit categories: ${fromCategory} to ${toCategory}`
    );
  }

  toBase(): number {
    return CONVERSION_TO_BASE[this.type];
  }

  equals(other: Unit): boolean {
    return this.type === other.type;
  }

  toString(): string {
    return this.type;
  }
}

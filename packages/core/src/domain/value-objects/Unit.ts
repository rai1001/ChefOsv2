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
 * Sistema de conversión de unidades
 */
export class Unit {
  constructor(public readonly type: UnitType) {}

  /**
   * Convierte una cantidad de esta unidad a otra unidad
   */
  convert(amount: number, toUnit: Unit): number {
    if (this.type === toUnit.type) {
      return amount;
    }

    const fromCategory = UNIT_CATEGORIES[this.type];
    const toCategory = UNIT_CATEGORIES[toUnit.type];

    if (fromCategory !== toCategory) {
      throw new Error(
        `Cannot convert between different unit categories: ${fromCategory} to ${toCategory}`
      );
    }

    if (fromCategory === UnitCategory.UNIT) {
      throw new Error('Cannot convert between units (ud)');
    }

    // Convertir a unidad base y luego a unidad destino
    const baseAmount = amount * CONVERSION_TO_BASE[this.type];
    return baseAmount / CONVERSION_TO_BASE[toUnit.type];
  }

  equals(other: Unit): boolean {
    return this.type === other.type;
  }

  toString(): string {
    return this.type;
  }
}

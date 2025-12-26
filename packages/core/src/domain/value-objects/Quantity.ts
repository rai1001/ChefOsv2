import { Unit } from './Unit';

/**
 * Value Object para representar cantidad con unidad
 */
export class Quantity {
  constructor(
    public readonly value: number,
    public readonly unit: Unit
  ) {
    if (value < 0) {
      throw new Error('Quantity value cannot be negative');
    }
  }

  /**
   * Convierte esta cantidad a otra unidad
   */
  convertTo(targetUnit: Unit): Quantity {
    const convertedValue = this.unit.convert(this.value, targetUnit);
    return new Quantity(convertedValue, targetUnit);
  }

  /**
   * Suma dos cantidades (convirtiendo si es necesario)
   */
  add(other: Quantity): Quantity {
    const convertedOther = other.convertTo(this.unit);
    return new Quantity(this.value + convertedOther.value, this.unit);
  }

  /**
   * Resta dos cantidades (convirtiendo si es necesario)
   */
  subtract(other: Quantity): Quantity {
    const convertedOther = other.convertTo(this.unit);
    const result = this.value - convertedOther.value;
    if (result < 0) {
      throw new Error('Cannot subtract to negative quantity');
    }
    return new Quantity(result, this.unit);
  }

  /**
   * Multiplica la cantidad por un factor
   */
  multiply(factor: number): Quantity {
    if (factor < 0) {
      throw new Error('Cannot multiply by negative factor');
    }
    return new Quantity(this.value * factor, this.unit);
  }

  /**
   * Divide la cantidad por un divisor
   */
  divide(divisor: number): Quantity {
    if (divisor <= 0) {
      throw new Error('Cannot divide by zero or negative number');
    }
    return new Quantity(this.value / divisor, this.unit);
  }

  /**
   * Compara si es mayor que otra cantidad
   */
  isGreaterThan(other: Quantity): boolean {
    const convertedOther = other.convertTo(this.unit);
    return this.value > convertedOther.value;
  }

  /**
   * Compara si es menor que otra cantidad
   */
  isLessThan(other: Quantity): boolean {
    const convertedOther = other.convertTo(this.unit);
    return this.value < convertedOther.value;
  }

  equals(other: Quantity): boolean {
    const convertedOther = other.convertTo(this.unit);
    return Math.abs(this.value - convertedOther.value) < 0.0001; // Tolerancia para decimales
  }

  toString(): string {
    return `${this.value} ${this.unit.toString()}`;
  }

  toJSON(): { value: number; unit: string } {
    return {
      value: this.value,
      unit: this.unit.toString(),
    };
  }
}

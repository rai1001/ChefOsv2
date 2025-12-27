import { Unit, ConversionContext } from './Unit';

/**
 * Value Object para representar cantidad con unidad
 */
export class Quantity {
  constructor(
    public readonly value: number,
    public readonly unit: Unit
  ) {
    if (value < 0) {
      throw new Error('Quantity cannot be negative');
    }
  }

  /**
   * Convierte esta cantidad a otra unidad
   */
  convertTo(targetUnit: Unit, context?: ConversionContext): Quantity {
    const convertedValue = this.unit.convert(this.value, targetUnit, context);
    return new Quantity(convertedValue, targetUnit);
  }

  /**
   * Suma dos cantidades (convirtiendo si es necesario)
   */
  add(other: Quantity, context?: ConversionContext): Quantity {
    const convertedOther = other.convertTo(this.unit, context);
    return new Quantity(this.value + convertedOther.value, this.unit);
  }

  /**
   * Resta dos cantidades (convirtiendo si es necesario)
   */
  subtract(other: Quantity, context?: ConversionContext): Quantity {
    const convertedOther = other.convertTo(this.unit, context);
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

  format(locale: string = 'es-ES'): string {
    const formattedValue = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 3,
      minimumFractionDigits: 0,
    }).format(this.value);
    return `${formattedValue} ${this.unit.toString()}`;
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

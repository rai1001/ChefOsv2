import { describe, it, expect } from 'vitest';
import { Quantity } from './Quantity';
import { Unit, UnitType } from './Unit';

describe('Quantity Value Object', () => {
  describe('constructor', () => {
    it('should create Quantity with value and unit', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      expect(quantity.value).toBe(10);
      expect(quantity.unit.type).toBe(UnitType.KG);
    });

    it('should accept zero value', () => {
      const quantity = new Quantity(0, new Unit(UnitType.L));
      expect(quantity.value).toBe(0);
    });

    it('should accept fractional values', () => {
      const quantity = new Quantity(2.5, new Unit(UnitType.KG));
      expect(quantity.value).toBe(2.5);
    });

    it('should accept different unit types', () => {
      const massQuantity = new Quantity(5, new Unit(UnitType.G));
      const volumeQuantity = new Quantity(3, new Unit(UnitType.ML));
      const unitQuantity = new Quantity(10, new Unit(UnitType.UNIT));

      expect(massQuantity.unit.type).toBe(UnitType.G);
      expect(volumeQuantity.unit.type).toBe(UnitType.ML);
      expect(unitQuantity.unit.type).toBe(UnitType.UNIT);
    });
  });

  describe('convertTo', () => {
    it('should convert mass units correctly (kg to g)', () => {
      const quantity = new Quantity(2, new Unit(UnitType.KG));
      const converted = quantity.convertTo(new Unit(UnitType.G));

      expect(converted.value).toBeCloseTo(2000, 5);
      expect(converted.unit.type).toBe(UnitType.G);
    });

    it('should convert mass units correctly (g to kg)', () => {
      const quantity = new Quantity(3000, new Unit(UnitType.G));
      const converted = quantity.convertTo(new Unit(UnitType.KG));

      expect(converted.value).toBeCloseTo(3, 5);
      expect(converted.unit.type).toBe(UnitType.KG);
    });

    it('should convert volume units correctly (L to ML)', () => {
      const quantity = new Quantity(1.5, new Unit(UnitType.L));
      const converted = quantity.convertTo(new Unit(UnitType.ML));

      expect(converted.value).toBeCloseTo(1500, 5);
      expect(converted.unit.type).toBe(UnitType.ML);
    });

    it('should convert volume units correctly (CUP to L)', () => {
      const quantity = new Quantity(4, new Unit(UnitType.CUP));
      const converted = quantity.convertTo(new Unit(UnitType.L));

      expect(converted.value).toBeCloseTo(0.946352, 5);
      expect(converted.unit.type).toBe(UnitType.L);
    });

    it('should return same value when converting to same unit', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      const converted = quantity.convertTo(new Unit(UnitType.KG));

      expect(converted.value).toBe(10);
      expect(converted.unit.type).toBe(UnitType.KG);
    });

    it('should throw error when converting between different categories', () => {
      const massQuantity = new Quantity(5, new Unit(UnitType.KG));

      expect(() => massQuantity.convertTo(new Unit(UnitType.L))).toThrow(
        'Cannot convert between different unit categories'
      );
    });

    it('should allow converting UNIT to same UNIT type', () => {
      const unitQuantity = new Quantity(5, new Unit(UnitType.UNIT));
      const converted = unitQuantity.convertTo(new Unit(UnitType.UNIT));

      expect(converted.value).toBe(5);
      expect(converted.unit.type).toBe(UnitType.UNIT);
    });

    it('should not modify original Quantity', () => {
      const original = new Quantity(2, new Unit(UnitType.KG));
      const originalValue = original.value;
      const originalUnit = original.unit.type;

      original.convertTo(new Unit(UnitType.G));

      expect(original.value).toBe(originalValue);
      expect(original.unit.type).toBe(originalUnit);
    });
  });

  describe('add', () => {
    it('should add quantities with same unit', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(5, new Unit(UnitType.KG));
      const result = qty1.add(qty2);

      expect(result.value).toBe(15);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should add quantities with different units (same category)', () => {
      const qty1 = new Quantity(2, new Unit(UnitType.KG)); // 2 kg
      const qty2 = new Quantity(500, new Unit(UnitType.G)); // 500 g = 0.5 kg
      const result = qty1.add(qty2);

      expect(result.value).toBeCloseTo(2.5, 5);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should maintain first quantity unit in result', () => {
      const qty1 = new Quantity(1000, new Unit(UnitType.G));
      const qty2 = new Quantity(1, new Unit(UnitType.KG));
      const result = qty1.add(qty2);

      expect(result.value).toBeCloseTo(2000, 5);
      expect(result.unit.type).toBe(UnitType.G);
    });

    it('should add zero correctly', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.L));
      const qty2 = new Quantity(0, new Unit(UnitType.L));
      const result = qty1.add(qty2);

      expect(result.value).toBe(10);
    });

    it('should handle fractional additions', () => {
      const qty1 = new Quantity(2.5, new Unit(UnitType.KG));
      const qty2 = new Quantity(1.75, new Unit(UnitType.KG));
      const result = qty1.add(qty2);

      expect(result.value).toBeCloseTo(4.25, 5);
    });

    it('should not modify original quantities', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(5, new Unit(UnitType.KG));

      qty1.add(qty2);

      expect(qty1.value).toBe(10);
      expect(qty2.value).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract quantities with same unit', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(3, new Unit(UnitType.KG));
      const result = qty1.subtract(qty2);

      expect(result.value).toBe(7);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should subtract quantities with different units (same category)', () => {
      const qty1 = new Quantity(2, new Unit(UnitType.KG)); // 2000 g
      const qty2 = new Quantity(500, new Unit(UnitType.G)); // 500 g
      const result = qty1.subtract(qty2);

      expect(result.value).toBeCloseTo(1.5, 5);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should subtract to zero', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.L));
      const qty2 = new Quantity(10, new Unit(UnitType.L));
      const result = qty1.subtract(qty2);

      expect(result.value).toBe(0);
    });

    it('should throw error when result would be negative', () => {
      const qty1 = new Quantity(5, new Unit(UnitType.KG));
      const qty2 = new Quantity(10, new Unit(UnitType.KG));

      expect(() => qty1.subtract(qty2)).toThrow('Cannot subtract to negative quantity');
    });

    it('should throw error for negative result with unit conversion', () => {
      const qty1 = new Quantity(100, new Unit(UnitType.G));
      const qty2 = new Quantity(1, new Unit(UnitType.KG)); // 1000 g

      expect(() => qty1.subtract(qty2)).toThrow('Cannot subtract to negative quantity');
    });

    it('should handle fractional subtractions', () => {
      const qty1 = new Quantity(5.75, new Unit(UnitType.L));
      const qty2 = new Quantity(2.25, new Unit(UnitType.L));
      const result = qty1.subtract(qty2);

      expect(result.value).toBeCloseTo(3.5, 5);
    });

    it('should not modify original quantities', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(3, new Unit(UnitType.KG));

      qty1.subtract(qty2);

      expect(qty1.value).toBe(10);
      expect(qty2.value).toBe(3);
    });
  });

  describe('multiply', () => {
    it('should multiply by integer factor', () => {
      const quantity = new Quantity(5, new Unit(UnitType.KG));
      const result = quantity.multiply(3);

      expect(result.value).toBe(15);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should multiply by fractional factor', () => {
      const quantity = new Quantity(10, new Unit(UnitType.L));
      const result = quantity.multiply(0.5);

      expect(result.value).toBe(5);
    });

    it('should multiply by zero', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      const result = quantity.multiply(0);

      expect(result.value).toBe(0);
    });

    it('should multiply by negative factor', () => {
      const quantity = new Quantity(10, new Unit(UnitType.G));
      const result = quantity.multiply(-2);

      expect(result.value).toBe(-20);
    });

    it('should preserve unit type', () => {
      const quantity = new Quantity(7, new Unit(UnitType.ML));
      const result = quantity.multiply(5);

      expect(result.unit.type).toBe(UnitType.ML);
    });

    it('should not modify original quantity', () => {
      const original = new Quantity(10, new Unit(UnitType.KG));
      original.multiply(3);

      expect(original.value).toBe(10);
    });
  });

  describe('divide', () => {
    it('should divide by integer divisor', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      const result = quantity.divide(2);

      expect(result.value).toBe(5);
      expect(result.unit.type).toBe(UnitType.KG);
    });

    it('should divide by fractional divisor', () => {
      const quantity = new Quantity(10, new Unit(UnitType.L));
      const result = quantity.divide(0.5);

      expect(result.value).toBe(20);
    });

    it('should handle fractional results', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      const result = quantity.divide(3);

      expect(result.value).toBeCloseTo(3.333333, 5);
    });

    it('should throw error when dividing by zero', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));

      expect(() => quantity.divide(0)).toThrow('Cannot divide by zero or negative number');
    });

    it('should throw error when dividing by negative number', () => {
      const quantity = new Quantity(10, new Unit(UnitType.G));

      expect(() => quantity.divide(-2)).toThrow('Cannot divide by zero or negative number');
    });

    it('should preserve unit type', () => {
      const quantity = new Quantity(20, new Unit(UnitType.CUP));
      const result = quantity.divide(4);

      expect(result.unit.type).toBe(UnitType.CUP);
    });

    it('should not modify original quantity', () => {
      const original = new Quantity(10, new Unit(UnitType.KG));
      original.divide(2);

      expect(original.value).toBe(10);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when greater with same unit', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(5, new Unit(UnitType.KG));

      expect(qty1.isGreaterThan(qty2)).toBe(true);
    });

    it('should return false when less with same unit', () => {
      const qty1 = new Quantity(3, new Unit(UnitType.L));
      const qty2 = new Quantity(7, new Unit(UnitType.L));

      expect(qty1.isGreaterThan(qty2)).toBe(false);
    });

    it('should return false when equal', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(10, new Unit(UnitType.KG));

      expect(qty1.isGreaterThan(qty2)).toBe(false);
    });

    it('should compare with unit conversion', () => {
      const qty1 = new Quantity(2, new Unit(UnitType.KG)); // 2000 g
      const qty2 = new Quantity(500, new Unit(UnitType.G)); // 500 g

      expect(qty1.isGreaterThan(qty2)).toBe(true);
    });

    it('should handle negative values', () => {
      const qty1 = new Quantity(-5, new Unit(UnitType.KG));
      const qty2 = new Quantity(-10, new Unit(UnitType.KG));

      expect(qty1.isGreaterThan(qty2)).toBe(true);
    });

    it('should handle zero comparisons', () => {
      const qty1 = new Quantity(5, new Unit(UnitType.L));
      const qty2 = new Quantity(0, new Unit(UnitType.L));

      expect(qty1.isGreaterThan(qty2)).toBe(true);
    });
  });

  describe('isLessThan', () => {
    it('should return true when less with same unit', () => {
      const qty1 = new Quantity(3, new Unit(UnitType.KG));
      const qty2 = new Quantity(7, new Unit(UnitType.KG));

      expect(qty1.isLessThan(qty2)).toBe(true);
    });

    it('should return false when greater with same unit', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.L));
      const qty2 = new Quantity(5, new Unit(UnitType.L));

      expect(qty1.isLessThan(qty2)).toBe(false);
    });

    it('should return false when equal', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(10, new Unit(UnitType.KG));

      expect(qty1.isLessThan(qty2)).toBe(false);
    });

    it('should compare with unit conversion', () => {
      const qty1 = new Quantity(100, new Unit(UnitType.G)); // 0.1 kg
      const qty2 = new Quantity(1, new Unit(UnitType.KG)); // 1 kg

      expect(qty1.isLessThan(qty2)).toBe(true);
    });

    it('should handle negative values', () => {
      const qty1 = new Quantity(-10, new Unit(UnitType.L));
      const qty2 = new Quantity(-5, new Unit(UnitType.L));

      expect(qty1.isLessThan(qty2)).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for equal quantities with same unit', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(10, new Unit(UnitType.KG));

      expect(qty1.equals(qty2)).toBe(true);
    });

    it('should return false for different values', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.L));
      const qty2 = new Quantity(5, new Unit(UnitType.L));

      expect(qty1.equals(qty2)).toBe(false);
    });

    it('should compare with unit conversion', () => {
      const qty1 = new Quantity(1, new Unit(UnitType.KG));
      const qty2 = new Quantity(1000, new Unit(UnitType.G));

      expect(qty1.equals(qty2)).toBe(true);
    });

    it('should handle tolerance for decimal precision', () => {
      const qty1 = new Quantity(10.00001, new Unit(UnitType.KG));
      const qty2 = new Quantity(10.00002, new Unit(UnitType.KG));

      expect(qty1.equals(qty2)).toBe(true); // Within 0.0001 tolerance
    });

    it('should return false when difference exceeds tolerance', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(10.001, new Unit(UnitType.KG));

      expect(qty1.equals(qty2)).toBe(false); // Exceeds 0.0001 tolerance
    });

    it('should handle zero equality', () => {
      const qty1 = new Quantity(0, new Unit(UnitType.L));
      const qty2 = new Quantity(0, new Unit(UnitType.ML));

      expect(qty1.equals(qty2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should format as string with value and unit', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      expect(quantity.toString()).toBe('10 kg');
    });

    it('should format fractional values', () => {
      const quantity = new Quantity(2.5, new Unit(UnitType.L));
      expect(quantity.toString()).toBe('2.5 L');
    });

    it('should handle different unit types', () => {
      const massQty = new Quantity(500, new Unit(UnitType.G));
      const volumeQty = new Quantity(250, new Unit(UnitType.ML));
      const unitQty = new Quantity(12, new Unit(UnitType.UNIT));

      expect(massQty.toString()).toBe('500 g');
      expect(volumeQty.toString()).toBe('250 ml');
      expect(unitQty.toString()).toBe('12 ud');
    });

    it('should handle zero', () => {
      const quantity = new Quantity(0, new Unit(UnitType.KG));
      expect(quantity.toString()).toBe('0 kg');
    });

    it('should handle negative values', () => {
      const quantity = new Quantity(-5, new Unit(UnitType.L));
      expect(quantity.toString()).toBe('-5 L');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON object', () => {
      const quantity = new Quantity(10, new Unit(UnitType.KG));
      const json = quantity.toJSON();

      expect(json).toEqual({
        value: 10,
        unit: 'kg',
      });
    });

    it('should handle fractional values', () => {
      const quantity = new Quantity(2.5, new Unit(UnitType.L));
      const json = quantity.toJSON();

      expect(json.value).toBe(2.5);
      expect(json.unit).toBe('L');
    });

    it('should handle different unit types', () => {
      const quantity = new Quantity(250, new Unit(UnitType.ML));
      const json = quantity.toJSON();

      expect(json.unit).toBe('ml');
    });

    it('should handle zero', () => {
      const quantity = new Quantity(0, new Unit(UnitType.G));
      const json = quantity.toJSON();

      expect(json.value).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should not modify original on convertTo', () => {
      const original = new Quantity(2, new Unit(UnitType.KG));
      original.convertTo(new Unit(UnitType.G));

      expect(original.value).toBe(2);
      expect(original.unit.type).toBe(UnitType.KG);
    });

    it('should not modify originals on add', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.KG));
      const qty2 = new Quantity(5, new Unit(UnitType.KG));

      qty1.add(qty2);

      expect(qty1.value).toBe(10);
      expect(qty2.value).toBe(5);
    });

    it('should not modify originals on subtract', () => {
      const qty1 = new Quantity(10, new Unit(UnitType.L));
      const qty2 = new Quantity(3, new Unit(UnitType.L));

      qty1.subtract(qty2);

      expect(qty1.value).toBe(10);
      expect(qty2.value).toBe(3);
    });

    it('should not modify original on multiply', () => {
      const original = new Quantity(5, new Unit(UnitType.KG));
      original.multiply(3);

      expect(original.value).toBe(5);
    });

    it('should not modify original on divide', () => {
      const original = new Quantity(10, new Unit(UnitType.L));
      original.divide(2);

      expect(original.value).toBe(10);
    });
  });
});

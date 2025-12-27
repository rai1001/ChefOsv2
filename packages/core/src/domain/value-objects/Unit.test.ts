import { describe, it, expect } from 'vitest';
import { Unit, UnitType } from './Unit';

describe('Unit Value Object', () => {
  describe('constructor', () => {
    it('should create Unit with given type', () => {
      const unit = new Unit(UnitType.KG);
      expect(unit.type).toBe(UnitType.KG);
    });

    it('should accept all mass unit types', () => {
      const massUnits = [UnitType.KG, UnitType.G, UnitType.MG, UnitType.LB, UnitType.OZ];

      massUnits.forEach((type) => {
        const unit = new Unit(type);
        expect(unit.type).toBe(type);
      });
    });

    it('should accept all volume unit types', () => {
      const volumeUnits = [
        UnitType.L,
        UnitType.ML,
        UnitType.GAL,
        UnitType.QT,
        UnitType.PT,
        UnitType.CUP,
        UnitType.TBSP,
        UnitType.TSP,
      ];

      volumeUnits.forEach((type) => {
        const unit = new Unit(type);
        expect(unit.type).toBe(type);
      });
    });

    it('should accept UNIT type', () => {
      const unit = new Unit(UnitType.UNIT);
      expect(unit.type).toBe(UnitType.UNIT);
    });
  });

  describe('convert - same unit', () => {
    it('should return same amount when converting to same unit', () => {
      const fromUnit = new Unit(UnitType.KG);
      const toUnit = new Unit(UnitType.KG);

      expect(fromUnit.convert(10, toUnit)).toBe(10);
    });

    it('should work for all unit types when converting to same', () => {
      const amount = 5;
      const types = [UnitType.KG, UnitType.L, UnitType.ML, UnitType.G, UnitType.UNIT];

      types.forEach((type) => {
        const fromUnit = new Unit(type);
        const toUnit = new Unit(type);
        expect(fromUnit.convert(amount, toUnit)).toBe(amount);
      });
    });
  });

  describe('convert - mass units', () => {
    it('should convert kg to g', () => {
      const kg = new Unit(UnitType.KG);
      const g = new Unit(UnitType.G);

      expect(kg.convert(1, g)).toBeCloseTo(1000, 5);
      expect(kg.convert(2.5, g)).toBeCloseTo(2500, 5);
    });

    it('should convert g to kg', () => {
      const g = new Unit(UnitType.G);
      const kg = new Unit(UnitType.KG);

      expect(g.convert(1000, kg)).toBeCloseTo(1, 5);
      expect(g.convert(500, kg)).toBeCloseTo(0.5, 5);
    });

    it('should convert kg to mg', () => {
      const kg = new Unit(UnitType.KG);
      const mg = new Unit(UnitType.MG);

      expect(kg.convert(1, mg)).toBeCloseTo(1000000, 5);
    });

    it('should convert mg to g', () => {
      const mg = new Unit(UnitType.MG);
      const g = new Unit(UnitType.G);

      expect(mg.convert(1000, g)).toBeCloseTo(1, 5);
    });

    it('should convert kg to lb', () => {
      const kg = new Unit(UnitType.KG);
      const lb = new Unit(UnitType.LB);

      expect(kg.convert(1, lb)).toBeCloseTo(2.20462, 4);
    });

    it('should convert lb to kg', () => {
      const lb = new Unit(UnitType.LB);
      const kg = new Unit(UnitType.KG);

      expect(lb.convert(2.20462, kg)).toBeCloseTo(1, 4);
    });

    it('should convert oz to g', () => {
      const oz = new Unit(UnitType.OZ);
      const g = new Unit(UnitType.G);

      expect(oz.convert(1, g)).toBeCloseTo(28.3495, 3);
    });

    it('should convert g to oz', () => {
      const g = new Unit(UnitType.G);
      const oz = new Unit(UnitType.OZ);

      expect(g.convert(28.3495, oz)).toBeCloseTo(1, 3);
    });

    it('should handle zero amount', () => {
      const kg = new Unit(UnitType.KG);
      const g = new Unit(UnitType.G);

      expect(kg.convert(0, g)).toBe(0);
    });

    it('should handle fractional amounts', () => {
      const kg = new Unit(UnitType.KG);
      const g = new Unit(UnitType.G);

      expect(kg.convert(0.001, g)).toBeCloseTo(1, 5);
    });
  });

  describe('convert - volume units', () => {
    it('should convert L to ML', () => {
      const l = new Unit(UnitType.L);
      const ml = new Unit(UnitType.ML);

      expect(l.convert(1, ml)).toBeCloseTo(1000, 5);
      expect(l.convert(2.5, ml)).toBeCloseTo(2500, 5);
    });

    it('should convert ML to L', () => {
      const ml = new Unit(UnitType.ML);
      const l = new Unit(UnitType.L);

      expect(ml.convert(1000, l)).toBeCloseTo(1, 5);
      expect(ml.convert(500, l)).toBeCloseTo(0.5, 5);
    });

    it('should convert GAL to L', () => {
      const gal = new Unit(UnitType.GAL);
      const l = new Unit(UnitType.L);

      expect(gal.convert(1, l)).toBeCloseTo(3.78541, 4);
    });

    it('should convert L to GAL', () => {
      const l = new Unit(UnitType.L);
      const gal = new Unit(UnitType.GAL);

      expect(l.convert(3.78541, gal)).toBeCloseTo(1, 4);
    });

    it('should convert QT to L', () => {
      const qt = new Unit(UnitType.QT);
      const l = new Unit(UnitType.L);

      expect(qt.convert(1, l)).toBeCloseTo(0.946353, 5);
    });

    it('should convert PT to L', () => {
      const pt = new Unit(UnitType.PT);
      const l = new Unit(UnitType.L);

      expect(pt.convert(1, l)).toBeCloseTo(0.473176, 5);
    });

    it('should convert CUP to L', () => {
      const cup = new Unit(UnitType.CUP);
      const l = new Unit(UnitType.L);

      expect(cup.convert(1, l)).toBeCloseTo(0.236588, 5);
    });

    it('should convert TBSP to L', () => {
      const tbsp = new Unit(UnitType.TBSP);
      const l = new Unit(UnitType.L);

      expect(tbsp.convert(1, l)).toBeCloseTo(0.0147868, 6);
    });

    it('should convert TSP to L', () => {
      const tsp = new Unit(UnitType.TSP);
      const l = new Unit(UnitType.L);

      expect(tsp.convert(1, l)).toBeCloseTo(0.00492892, 7);
    });

    it('should convert between any volume units', () => {
      const cup = new Unit(UnitType.CUP);
      const ml = new Unit(UnitType.ML);

      expect(cup.convert(1, ml)).toBeCloseTo(236.588, 2);
    });

    it('should handle zero volume', () => {
      const l = new Unit(UnitType.L);
      const ml = new Unit(UnitType.ML);

      expect(l.convert(0, ml)).toBe(0);
    });
  });

  describe('convert - error cases', () => {
    it('should throw error when converting mass to volume', () => {
      const kg = new Unit(UnitType.KG);
      const l = new Unit(UnitType.L);

      expect(() => kg.convert(10, l)).toThrow(
        'Cannot convert between different unit categories: mass to volume'
      );
    });

    it('should throw error when converting volume to mass', () => {
      const l = new Unit(UnitType.L);
      const kg = new Unit(UnitType.KG);

      expect(() => l.convert(10, kg)).toThrow(
        'Cannot convert between different unit categories: volume to mass'
      );
    });

    it('should throw error when converting mass to UNIT', () => {
      const kg = new Unit(UnitType.KG);
      const unit = new Unit(UnitType.UNIT);

      expect(() => kg.convert(10, unit)).toThrow(
        'Cannot convert between different unit categories: mass to unit'
      );
    });

    it('should throw error when converting volume to UNIT', () => {
      const l = new Unit(UnitType.L);
      const unit = new Unit(UnitType.UNIT);

      expect(() => l.convert(10, unit)).toThrow(
        'Cannot convert between different unit categories: volume to unit'
      );
    });

    it('should throw error when converting UNIT to mass', () => {
      const unit = new Unit(UnitType.UNIT);
      const kg = new Unit(UnitType.KG);

      expect(() => unit.convert(10, kg)).toThrow(
        'Cannot convert between different unit categories: unit to mass'
      );
    });

    it('should throw error when converting UNIT to volume', () => {
      const unit = new Unit(UnitType.UNIT);
      const l = new Unit(UnitType.L);

      expect(() => unit.convert(10, l)).toThrow(
        'Cannot convert between different unit categories: unit to volume'
      );
    });
  });

  describe('equals', () => {
    it('should return true for same unit types', () => {
      const unit1 = new Unit(UnitType.KG);
      const unit2 = new Unit(UnitType.KG);

      expect(unit1.equals(unit2)).toBe(true);
    });

    it('should return false for different unit types', () => {
      const unit1 = new Unit(UnitType.KG);
      const unit2 = new Unit(UnitType.G);

      expect(unit1.equals(unit2)).toBe(false);
    });

    it('should work with volume units', () => {
      const unit1 = new Unit(UnitType.L);
      const unit2 = new Unit(UnitType.L);
      const unit3 = new Unit(UnitType.ML);

      expect(unit1.equals(unit2)).toBe(true);
      expect(unit1.equals(unit3)).toBe(false);
    });

    it('should work with UNIT type', () => {
      const unit1 = new Unit(UnitType.UNIT);
      const unit2 = new Unit(UnitType.UNIT);
      const unit3 = new Unit(UnitType.KG);

      expect(unit1.equals(unit2)).toBe(true);
      expect(unit1.equals(unit3)).toBe(false);
    });

    it('should compare all mass units correctly', () => {
      const kg = new Unit(UnitType.KG);
      const g = new Unit(UnitType.G);
      const mg = new Unit(UnitType.MG);
      const lb = new Unit(UnitType.LB);
      const oz = new Unit(UnitType.OZ);

      expect(kg.equals(g)).toBe(false);
      expect(kg.equals(mg)).toBe(false);
      expect(kg.equals(lb)).toBe(false);
      expect(kg.equals(oz)).toBe(false);
      expect(g.equals(mg)).toBe(false);
    });

    it('should compare all volume units correctly', () => {
      const l = new Unit(UnitType.L);
      const ml = new Unit(UnitType.ML);
      const gal = new Unit(UnitType.GAL);

      expect(l.equals(ml)).toBe(false);
      expect(l.equals(gal)).toBe(false);
      expect(ml.equals(gal)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation of unit type', () => {
      const kg = new Unit(UnitType.KG);
      expect(kg.toString()).toBe('kg');
    });

    it('should work for all mass units', () => {
      expect(new Unit(UnitType.KG).toString()).toBe('kg');
      expect(new Unit(UnitType.G).toString()).toBe('g');
      expect(new Unit(UnitType.MG).toString()).toBe('mg');
      expect(new Unit(UnitType.LB).toString()).toBe('lb');
      expect(new Unit(UnitType.OZ).toString()).toBe('oz');
    });

    it('should work for all volume units', () => {
      expect(new Unit(UnitType.L).toString()).toBe('L');
      expect(new Unit(UnitType.ML).toString()).toBe('ml');
      expect(new Unit(UnitType.GAL).toString()).toBe('gal');
      expect(new Unit(UnitType.QT).toString()).toBe('qt');
      expect(new Unit(UnitType.PT).toString()).toBe('pt');
      expect(new Unit(UnitType.CUP).toString()).toBe('cup');
      expect(new Unit(UnitType.TBSP).toString()).toBe('tbsp');
      expect(new Unit(UnitType.TSP).toString()).toBe('tsp');
    });

    it('should work for UNIT type', () => {
      expect(new Unit(UnitType.UNIT).toString()).toBe('ud');
    });
  });

  describe('conversion precision', () => {
    it('should maintain precision in round-trip conversions (mass)', () => {
      const kg = new Unit(UnitType.KG);
      const g = new Unit(UnitType.G);

      const original = 5.5;
      const toGrams = kg.convert(original, g);
      const backToKg = g.convert(toGrams, kg);

      expect(backToKg).toBeCloseTo(original, 10);
    });

    it('should maintain precision in round-trip conversions (volume)', () => {
      const l = new Unit(UnitType.L);
      const ml = new Unit(UnitType.ML);

      const original = 3.75;
      const toMl = l.convert(original, ml);
      const backToL = ml.convert(toMl, l);

      expect(backToL).toBeCloseTo(original, 10);
    });

    it('should handle very small amounts', () => {
      const kg = new Unit(UnitType.KG);
      const mg = new Unit(UnitType.MG);

      expect(kg.convert(0.000001, mg)).toBeCloseTo(1, 5);
    });

    it('should handle very large amounts', () => {
      const mg = new Unit(UnitType.MG);
      const kg = new Unit(UnitType.KG);

      expect(mg.convert(1000000, kg)).toBeCloseTo(1, 5);
    });
  });
});

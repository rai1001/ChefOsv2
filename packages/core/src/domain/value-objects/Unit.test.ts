import { describe, it, expect } from 'vitest';
import { Unit, UnitType } from './Unit';

describe('Unit', () => {
  describe('creation', () => {
    it('should create from string', () => {
      const u = Unit.from('kg');
      expect(u.toString()).toBe('kg');
      expect(u.type).toBe(UnitType.KG);
    });

    it('should throw error for invalid unit', () => {
      expect(() => Unit.from('invalid')).toThrow('Invalid unit type');
    });
  });

  describe('same-category conversion', () => {
    it('should convert weight units correctly', () => {
      const kg = Unit.from('kg');
      const g = Unit.from('g');
      expect(kg.convert(1, g)).toBe(1000);
      expect(g.convert(500, kg)).toBe(0.5);
    });

    it('should convert volume units correctly', () => {
      const l = Unit.from('L');
      const ml = Unit.from('ml');
      expect(l.convert(1, ml)).toBe(1000);
      expect(ml.convert(250, l)).toBe(0.25);
    });
  });

  describe('cross-category conversion (Mass <-> Volume)', () => {
    it('should convert L to kg using density (Density=1, like Water)', () => {
      const l = Unit.from('L');
      const kg = Unit.from('kg');
      const context = { density: 1 };
      expect(l.convert(1, kg, context)).toBe(1);
    });

    it('should convert L to kg using density (Density=0.9, like Oil)', () => {
      const l = Unit.from('L');
      const kg = Unit.from('kg');
      const context = { density: 0.9 };
      // 1L * 0.9 kg/L = 0.9 kg
      expect(l.convert(1, kg, context)).toBe(0.9);
    });

    it('should convert g to ml using density (Density=1.2, Honey)', () => {
      const g = Unit.from('g');
      const ml = Unit.from('ml');
      const context = { density: 1.2 };
      // 120g / 1.2 g/ml = 100ml
      expect(g.convert(120, ml, context)).toBe(100);
    });

    it('should throw error if density is missing for cross-category conversion', () => {
      const l = Unit.from('L');
      const kg = Unit.from('kg');
      expect(() => l.convert(1, kg)).toThrow('Density is required');
    });
  });

  describe('piece-weight conversion', () => {
    it('should convert units (ud) to weight', () => {
      const ud = Unit.from('ud');
      const g = Unit.from('g');
      const context = { pieceWeight: 50 }; // 50g per egg
      expect(ud.convert(10, g, context)).toBe(500);
    });

    it('should convert weight to units (ud)', () => {
      const ud = Unit.from('ud');
      const g = Unit.from('g');
      const context = { pieceWeight: 50 };
      expect(g.convert(250, ud, context)).toBe(5);
    });

    it('should throw error if pieceWeight is missing', () => {
      const ud = Unit.from('ud');
      const g = Unit.from('g');
      expect(() => ud.convert(1, g)).toThrow('Piece weight is required');
    });
  });
});

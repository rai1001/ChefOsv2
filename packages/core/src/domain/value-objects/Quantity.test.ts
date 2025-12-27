import { describe, it, expect } from 'vitest';
import { Quantity } from './Quantity';
import { Unit } from './Unit';

describe('Quantity', () => {
  describe('creation', () => {
    it('should create from value and unit', () => {
      const q = new Quantity(10, Unit.from('kg'));
      expect(q.value).toBe(10);
      expect(q.unit.toString()).toBe('kg');
    });

    it('should throw on negative value', () => {
      expect(() => new Quantity(-1, Unit.from('kg'))).toThrow('Quantity cannot be negative');
    });
  });

  describe('same-category operations', () => {
    it('should add quantities with different compatible units', () => {
      const q1 = new Quantity(1, Unit.from('kg'));
      const q2 = new Quantity(500, Unit.from('g'));
      const result = q1.add(q2);
      expect(result.value).toBe(1.5);
      expect(result.unit.toString()).toBe('kg');
    });

    it('should subtract quantities', () => {
      const q1 = new Quantity(2, Unit.from('kg'));
      const q2 = new Quantity(500, Unit.from('g'));
      const result = q1.subtract(q2);
      expect(result.value).toBe(1.5);
    });

    it('should throw if subtraction results in negative', () => {
      const q1 = new Quantity(1, Unit.from('kg'));
      const q2 = new Quantity(2, Unit.from('kg'));
      expect(() => q1.subtract(q2)).toThrow('Cannot subtract to negative quantity');
    });
  });

  describe('cross-category operations (Mass <-> Volume)', () => {
    it('should add L to kg using density', () => {
      const mass = new Quantity(2, Unit.from('kg'));
      const volume = new Quantity(1, Unit.from('L'));
      const context = { density: 1.1 }; // 1.1 kg/L

      // 2kg + (1L * 1.1kg/L) = 3.1kg
      const result = mass.add(volume, context);
      expect(result.value).toBe(3.1);
    });

    it('should convert volume to mass with density', () => {
      const volume = new Quantity(500, Unit.from('ml'));
      const context = { density: 0.8 }; // 0.8 g/ml
      const result = volume.convertTo(Unit.from('g'), context);
      // 500ml * 0.8 g/ml = 400g
      expect(result.value).toBe(400);
      expect(result.unit.toString()).toBe('g');
    });
  });

  describe('formatting', () => {
    it('should format correctly (basic check)', () => {
      const q = new Quantity(1234.567, Unit.from('kg'));
      const formatted = q.format('en-US');
      // en-US uses , for thousands and . for decimals
      // But some node versions might not have full ICU data
      // Let's check for the presence of the number and the unit
      expect(formatted).toContain('1,234.567');
      expect(formatted).toContain('kg');
    });

    it('should format with limited precision', () => {
      const q = new Quantity(1.33333333, Unit.from('L'));
      const formatted = q.format('en-US');
      expect(formatted).toContain('1.333');
      expect(formatted).not.toContain('1.3333');
      expect(formatted).toContain('L');
    });
  });
});

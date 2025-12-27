import { describe, it, expect } from 'vitest';
import { Money } from '../../domain/value-objects/Money';

describe('Money', () => {
  describe('creation', () => {
    it('should create from amount', () => {
      const money = new Money(100);
      expect(money.amount).toBe(100);
      expect(money.centsValue).toBe(10000);
    });

    it('should create from cents', () => {
      const money = Money.fromCents(10000);
      expect(money.amount).toBe(100);
      expect(money.centsValue).toBe(10000);
    });

    it('should throw on negative amount', () => {
      expect(() => new Money(-1)).toThrow();
    });
  });

  describe('operations', () => {
    it('should add money', () => {
      const m1 = new Money(10);
      const m2 = new Money(20);
      const result = m1.add(m2);
      expect(result.amount).toBe(30);
    });

    it('should subtract money', () => {
      const m1 = new Money(30);
      const m2 = new Money(10);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(20);
    });

    it('should multiply money', () => {
      const m1 = new Money(10);
      const result = m1.multiply(2.5);
      expect(result.amount).toBe(25);
    });
  });

  describe('comparison', () => {
    it('should compare equality', () => {
      const m1 = new Money(10);
      const m2 = new Money(10);
      expect(m1.equals(m2)).toBe(true);
    });
  });
});

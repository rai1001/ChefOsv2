import { describe, it, expect } from 'vitest';
import { Money } from './Money';

describe('Money Value Object', () => {
  describe('constructor', () => {
    it('should create Money with amount in cents', () => {
      const money = new Money(10.5);
      expect(money.amount).toBe(10.5);
      expect(money.centsValue).toBe(1050);
    });

    it('should default to USD currency', () => {
      const money = new Money(5);
      expect(money.currency).toBe('USD');
    });

    it('should accept custom currency', () => {
      const money = new Money(5, 'EUR');
      expect(money.currency).toBe('EUR');
    });

    it('should handle floating point precision correctly', () => {
      const money = new Money(0.1 + 0.2); // Classic JS problem: 0.30000000000000004
      expect(money.amount).toBe(0.3);
      expect(money.centsValue).toBe(30);
    });

    it('should round fractional cents', () => {
      const money = new Money(10.555); // 1055.5 cents
      expect(money.centsValue).toBe(1056); // Rounded
    });
  });

  describe('fromCents', () => {
    it('should create Money from cents', () => {
      const money = Money.fromCents(1050);
      expect(money.amount).toBe(10.5);
      expect(money.centsValue).toBe(1050);
    });

    it('should accept currency parameter', () => {
      const money = Money.fromCents(500, 'EUR');
      expect(money.currency).toBe('EUR');
      expect(money.amount).toBe(5.0);
    });

    it('should handle zero cents', () => {
      const money = Money.fromCents(0);
      expect(money.amount).toBe(0);
      expect(money.centsValue).toBe(0);
    });

    it('should handle negative cents', () => {
      const money = Money.fromCents(-500);
      expect(money.amount).toBe(-5.0);
      expect(money.centsValue).toBe(-500);
    });
  });

  describe('getters', () => {
    it('should return amount as decimal', () => {
      const money = Money.fromCents(1234);
      expect(money.amount).toBe(12.34);
    });

    it('should return cents value', () => {
      const money = new Money(12.34);
      expect(money.centsValue).toBe(1234);
    });
  });

  describe('add', () => {
    it('should add two Money objects with same currency', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);
      const result = money1.add(money2);

      expect(result.amount).toBe(15);
      expect(result.centsValue).toBe(1500);
    });

    it('should throw error when adding different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');

      expect(() => usd.add(eur)).toThrow('Currency mismatch: USD vs EUR');
    });

    it('should handle fractional amounts correctly', () => {
      const money1 = new Money(10.25);
      const money2 = new Money(5.75);
      const result = money1.add(money2);

      expect(result.amount).toBe(16.0);
    });
  });

  describe('subtract', () => {
    it('should subtract two Money objects with same currency', () => {
      const money1 = new Money(10);
      const money2 = new Money(3);
      const result = money1.subtract(money2);

      expect(result.amount).toBe(7);
      expect(result.centsValue).toBe(700);
    });

    it('should throw error when subtracting different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');

      expect(() => usd.subtract(eur)).toThrow('Currency mismatch: USD vs EUR');
    });

    it('should allow negative results', () => {
      const money1 = new Money(5);
      const money2 = new Money(10);
      const result = money1.subtract(money2);

      expect(result.amount).toBe(-5);
      expect(result.centsValue).toBe(-500);
    });
  });

  describe('multiply', () => {
    it('should multiply by a factor', () => {
      const money = new Money(10);
      const result = money.multiply(3);

      expect(result.amount).toBe(30);
      expect(result.centsValue).toBe(3000);
    });

    it('should multiply by fractional factor', () => {
      const money = new Money(10);
      const result = money.multiply(1.5);

      expect(result.amount).toBe(15);
    });

    it('should multiply by zero', () => {
      const money = new Money(10);
      const result = money.multiply(0);

      expect(result.amount).toBe(0);
    });

    it('should multiply by negative factor', () => {
      const money = new Money(10);
      const result = money.multiply(-2);

      expect(result.amount).toBe(-20);
    });

    it('should round fractional cents', () => {
      const money = new Money(10.01); // 1001 cents
      const result = money.multiply(0.333); // 1001 * 0.333 = 333.333 cents

      expect(result.centsValue).toBe(333); // Rounded
    });

    it('should preserve currency', () => {
      const money = new Money(10, 'EUR');
      const result = money.multiply(2);

      expect(result.currency).toBe('EUR');
    });
  });

  describe('divide', () => {
    it('should divide by a divisor', () => {
      const money = new Money(10);
      const result = money.divide(2);

      expect(result.amount).toBe(5);
      expect(result.centsValue).toBe(500);
    });

    it('should throw error when dividing by zero', () => {
      const money = new Money(10);

      expect(() => money.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should round fractional cents', () => {
      const money = new Money(10); // 1000 cents
      const result = money.divide(3); // 1000 / 3 = 333.333... cents

      expect(result.centsValue).toBe(333); // Rounded
    });

    it('should handle negative divisor', () => {
      const money = new Money(10);
      const result = money.divide(-2);

      expect(result.amount).toBe(-5);
    });

    it('should preserve currency', () => {
      const money = new Money(10, 'EUR');
      const result = money.divide(2);

      expect(result.currency).toBe('EUR');
    });
  });

  describe('equals', () => {
    it('should return true for equal Money objects', () => {
      const money1 = new Money(10, 'USD');
      const money2 = new Money(10, 'USD');

      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);

      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const money1 = new Money(10, 'USD');
      const money2 = new Money(10, 'EUR');

      expect(money1.equals(money2)).toBe(false);
    });

    it('should compare using cents for precision', () => {
      const money1 = Money.fromCents(1050);
      const money2 = new Money(10.5);

      expect(money1.equals(money2)).toBe(true);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when greater', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);

      expect(money1.isGreaterThan(money2)).toBe(true);
    });

    it('should return false when less', () => {
      const money1 = new Money(5);
      const money2 = new Money(10);

      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it('should return false when equal', () => {
      const money1 = new Money(10);
      const money2 = new Money(10);

      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it('should throw error for different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');

      expect(() => usd.isGreaterThan(eur)).toThrow('Currency mismatch: USD vs EUR');
    });

    it('should handle negative amounts', () => {
      const money1 = Money.fromCents(-500);
      const money2 = Money.fromCents(-1000);

      expect(money1.isGreaterThan(money2)).toBe(true);
    });
  });

  describe('isLessThan', () => {
    it('should return true when less', () => {
      const money1 = new Money(5);
      const money2 = new Money(10);

      expect(money1.isLessThan(money2)).toBe(true);
    });

    it('should return false when greater', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);

      expect(money1.isLessThan(money2)).toBe(false);
    });

    it('should return false when equal', () => {
      const money1 = new Money(10);
      const money2 = new Money(10);

      expect(money1.isLessThan(money2)).toBe(false);
    });

    it('should throw error for different currencies', () => {
      const usd = new Money(10, 'USD');
      const eur = new Money(5, 'EUR');

      expect(() => usd.isLessThan(eur)).toThrow('Currency mismatch: USD vs EUR');
    });
  });

  describe('toString', () => {
    it('should format as currency string', () => {
      const money = new Money(10.5);
      expect(money.toString()).toBe('USD 10.50');
    });

    it('should include custom currency', () => {
      const money = new Money(15.75, 'EUR');
      expect(money.toString()).toBe('EUR 15.75');
    });

    it('should format zero correctly', () => {
      const money = new Money(0);
      expect(money.toString()).toBe('USD 0.00');
    });

    it('should format negative amounts', () => {
      const money = Money.fromCents(-1050);
      expect(money.toString()).toBe('USD -10.50');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON object', () => {
      const money = new Money(10.5, 'USD');
      const json = money.toJSON();

      expect(json).toEqual({
        amount: 10.5,
        currency: 'USD',
      });
    });

    it('should include custom currency', () => {
      const money = new Money(15.75, 'EUR');
      const json = money.toJSON();

      expect(json.currency).toBe('EUR');
      expect(json.amount).toBe(15.75);
    });

    it('should handle zero amount', () => {
      const money = new Money(0);
      const json = money.toJSON();

      expect(json.amount).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should not modify original Money on add', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);
      const originalAmount = money1.amount;

      money1.add(money2);

      expect(money1.amount).toBe(originalAmount);
    });

    it('should not modify original Money on subtract', () => {
      const money1 = new Money(10);
      const money2 = new Money(5);
      const originalCents = money1.centsValue;

      money1.subtract(money2);

      expect(money1.centsValue).toBe(originalCents);
    });

    it('should not modify original Money on multiply', () => {
      const money = new Money(10);
      const originalAmount = money.amount;

      money.multiply(3);

      expect(money.amount).toBe(originalAmount);
    });

    it('should not modify original Money on divide', () => {
      const money = new Money(10);
      const originalAmount = money.amount;

      money.divide(2);

      expect(money.amount).toBe(originalAmount);
    });
  });
});

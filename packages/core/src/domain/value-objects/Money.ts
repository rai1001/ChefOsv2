/**
 * Value Object para representar dinero de forma segura
 * Evita problemas de precisión con floating point usando centavos
 */
export class Money {
  private readonly cents: number;
  public readonly currency: string;

  constructor(amount: number, currency: string = 'USD') {
    // Convertir a centavos para evitar problemas de precisión
    this.cents = Math.round(amount * 100);
    this.currency = currency;
  }

  static fromCents(cents: number, currency: string = 'USD'): Money {
    const money = Object.create(Money.prototype);
    money.cents = cents;
    money.currency = currency;
    return money;
  }

  get amount(): number {
    return this.cents / 100;
  }

  get centsValue(): number {
    return this.cents;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor), this.currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return Money.fromCents(Math.round(this.cents / divisor), this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }
}

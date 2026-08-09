import { ValidationError } from '@shared/errors';

import { ValueObject } from './value-object.base';

/**
 * Money as a non-negative integer number of cents. Never uses floating point
 * for storage or arithmetic. Persisted as a `numeric(12,2)` decimal string.
 */
export class Money extends ValueObject<{ cents: number }> {
  private constructor(cents: number) {
    super({ cents });
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new ValidationError('El monto debe ser un número entero no negativo de centavos', {
        cents,
      });
    }
    return new Money(cents);
  }

  /** Parses a decimal string like `"100"`, `"100.5"` or `"100.50"`. */
  static fromDecimalString(value: string): Money {
    const normalized = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new ValidationError('Monto inválido', { value });
    }
    const [whole, frac = ''] = normalized.split('.');
    const cents = Number(whole) * 100 + Number(`${frac}00`.slice(0, 2));
    return new Money(cents);
  }

  get cents(): number {
    return this.props.cents;
  }

  /** Serializes to a `numeric(12,2)`-compatible decimal string, e.g. `"100.50"`. */
  toDecimalString(): string {
    const cents = this.props.cents;
    return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
  }

  toNumber(): number {
    return this.props.cents / 100;
  }
}

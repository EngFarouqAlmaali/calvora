import { ErrorCode, MathError } from '../errors'

/**
 * Doubles carry about 15.95 decimal digits. Rounding to 15 digits reveals the
 * short decimal a result was "meant" to be (`0.30000000000000004` → `0.3`).
 */
const SIGNIFICANT_DIGITS = 15

/**
 * A rounded value is only trusted when it is genuinely short: at most this
 * many significant digits once trailing zeros are dropped. That means the raw
 * result sat within ~1e-14 of a short decimal, which is representation noise.
 * Long results such as `1/3` are left untouched, so `(1/3)*3` is still `1`.
 */
const MAX_SHORT_DIGITS = 13

function countSignificantDigits(value: number): number {
  const [mantissa = ''] = value.toExponential().split('e')
  return mantissa.replace(/[-.]/g, '').length
}

/**
 * Remove floating-point representation noise and normalise `-0` to `0`.
 * Integers are always exact doubles and are returned unchanged. Non-finite
 * values are returned unchanged.
 */
export function cleanFloat(value: number): number {
  if (value === 0) return 0
  if (!Number.isFinite(value) || Number.isInteger(value)) return value
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS))
  if (!Number.isFinite(rounded)) return value
  return countSignificantDigits(rounded) <= MAX_SHORT_DIGITS ? rounded : value
}

/**
 * Assert a computed value is a finite real number, then clean it. NaN means
 * the result is not a real number; infinity means it does not fit a double.
 */
export function ensureReal(value: number): number {
  if (Number.isNaN(value)) {
    throw new MathError(ErrorCode.DOMAIN_ERROR, 'The result is not a real number.')
  }
  if (!Number.isFinite(value)) {
    throw new MathError(ErrorCode.OVERFLOW, 'The result is too large to represent.')
  }
  return cleanFloat(value)
}

export function divide(numerator: number, denominator: number): number {
  if (denominator === 0) throw new MathError(ErrorCode.DIVISION_BY_ZERO, 'Division by zero.')
  return numerator / denominator
}

export function power(base: number, exponent: number): number {
  if (base === 0 && exponent < 0) {
    throw new MathError(ErrorCode.DIVISION_BY_ZERO, 'Zero cannot be raised to a negative power.')
  }
  if (base < 0 && !Number.isInteger(exponent)) {
    throw new MathError(
      ErrorCode.DOMAIN_ERROR,
      'A negative number cannot be raised to a fractional power (the result is not real).',
    )
  }
  return Math.pow(base, exponent)
}

/** Largest integer whose factorial is representable as a finite double. */
export const MAX_FACTORIAL_INPUT = 170

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > MAX_FACTORIAL_INPUT) {
    throw new MathError(
      ErrorCode.DOMAIN_ERROR,
      `Factorial is only defined for whole numbers from 0 to ${MAX_FACTORIAL_INPUT}.`,
    )
  }
  let result = 1
  for (let i = 2; i <= n; i += 1) result *= i
  return result
}

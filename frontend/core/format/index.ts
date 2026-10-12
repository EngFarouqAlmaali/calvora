/** Significant digits shown for non-integer results. */
export const DISPLAY_SIGNIFICANT_DIGITS = 12

function trimTrailingZeros(mantissa: string): string {
  return mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa
}

/**
 * Format a number for display.
 *
 * - whole numbers up to 2^53 − 1 are shown exactly;
 * - other values are rounded to 12 significant digits with trailing zeros
 *   removed (`0.30000000000000004` → `0.3`);
 * - very large and very small magnitudes use scientific notation (`1.5e-7`);
 * - `-0` is shown as `0`.
 */
export function formatNumber(
  value: number,
  significantDigits: number = DISPLAY_SIGNIFICANT_DIGITS,
): string {
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞'
  if (value === 0) return '0'

  const magnitude = Math.abs(value)

  if (Number.isInteger(value) && magnitude <= Number.MAX_SAFE_INTEGER) return String(value)

  if (magnitude >= 1e15 || magnitude < 1e-6) {
    const [mantissa = '', exponent = '+0'] = value.toExponential(significantDigits - 1).split('e')
    return `${trimTrailingZeros(mantissa)}e${exponent}`
  }

  return String(Number(value.toPrecision(significantDigits)))
}

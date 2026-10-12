import { describe, expect, it } from 'vitest'
import { formatNumber } from '@/core'
import { scientific, value } from './helpers'

function shown(input: string): string {
  const outcome = scientific.evaluate(input)
  if (!outcome.ok) throw new Error(outcome.error.message)
  return outcome.formatted
}

describe('floating point: classic representation errors', () => {
  it.each([
    ['0.1+0.2', 0.3],
    ['0.3-0.1', 0.2],
    ['0.1*3', 0.3],
    ['0.7+0.1', 0.8],
    ['1.1+2.2', 3.3],
    ['4.35*100', 435],
    ['1.15*100', 115],
    ['0.57*100', 57],
    ['3*1.1', 3.3],
    ['0.2*0.2', 0.04],
    ['1-0.9', 0.1],
  ])('%s = %d exactly', (input, expected) => {
    expect(value(input)).toBe(expected)
  })

  it('formats them without trailing noise', () => {
    expect(shown('0.1+0.2')).toBe('0.3')
    expect(shown('1/3')).toBe('0.333333333333')
    expect(shown('2/3')).toBe('0.666666666667')
    expect(shown('10/4')).toBe('2.5')
  })

  it('compares exactly after cleaning', () => {
    expect(value('(0.1+0.2)-0.3')).toBe(0)
    expect(value('0.1*3-0.3')).toBe(0)
  })
})

describe('floating point: magnitude extremes', () => {
  it('keeps exact integers up to 2^53 - 1', () => {
    expect(value('9007199254740991')).toBe(9007199254740991)
    expect(value('2^53-1')).toBe(9007199254740991)
    expect(value('2^50+1')).toBe(1125899906842625)
  })

  it('handles very large and very small values', () => {
    expect(value('1e300')).toBe(1e300)
    expect(value('1e-300')).toBe(1e-300)
    expect(value('1e-300*1e-300')).toBe(0)
    expect(value('1e308')).toBe(1e308)
  })

  it('preserves the sign of tiny results', () => {
    expect(value('-1e-300')).toBe(-1e-300)
  })

  it('does not lose integers to cleaning', () => {
    expect(value('123456789012345')).toBe(123456789012345)
    expect(value('99999999999999*10')).toBe(999999999999990)
  })

  it('keeps full precision for non-terminating fractions', () => {
    expect(value('1/3')).toBe(1 / 3)
    expect(value('2/3')).toBe(2 / 3)
  })
})

describe('floating point: known limitation', () => {
  it('cannot always recover a short decimal after catastrophic cancellation', () => {
    // 9.95 - 9 leaves only ~15 meaningful digits, so the stored value is not
    // snapped; the 12-digit display still shows the intended answer.
    expect(value('9.95-9')).toBeCloseTo(0.95, 12)
    expect(shown('9.95-9')).toBe('0.95')
  })
})

describe('floating point: repeated operations', () => {
  it('does not accumulate drift', () => {
    let expression = '0'
    for (let i = 0; i < 10; i += 1) expression += '+0.1'
    expect(value(expression)).toBe(1)
  })

  it('keeps identities exact', () => {
    expect(value('sqrt(2)^2')).toBe(2)
    expect(value('(1/3)*3')).toBe(1)
    expect(value('10^-2*100')).toBe(1)
  })

  it('returns zero for x - x', () => {
    expect(value('123.456-123.456')).toBe(0)
  })
})

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [5, '5'],
    [-5, '-5'],
    [1.5, '1.5'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333'],
    [100, '100'],
    [1e14, '100000000000000'],
    [9007199254740991, '9007199254740991'],
    [1e15, '1000000000000000'],
    [1e16, '1e+16'],
    [1.5e20, '1.5e+20'],
    [1e-7, '1e-7'],
    [1.5e-7, '1.5e-7'],
    [0.000001, '0.000001'],
    [-2.5e-10, '-2.5e-10'],
    [123456.789, '123456.789'],
    [Math.PI, '3.14159265359'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, '∞'],
    [Number.NEGATIVE_INFINITY, '-∞'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatNumber(input)).toBe(expected)
  })

  it('honours a custom number of significant digits', () => {
    expect(formatNumber(Math.PI, 5)).toBe('3.1416')
    expect(formatNumber(1e20 / 3, 4)).toBe('3.333e+19')
  })

  it('never emits a trailing decimal point or trailing zeros', () => {
    for (const n of [1.5, 2.25, 1 / 7, 1e-10, 12345.6789, 1e21 / 7]) {
      expect(formatNumber(n)).not.toMatch(/\.$|\.\d*0(e|$)/)
    }
  })
})

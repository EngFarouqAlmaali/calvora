import { describe, expect, it } from 'vitest'
import { ErrorCode } from '@/core'
import { errorOf, value } from './helpers'

describe('scientific: trigonometry in degrees', () => {
  it.each([
    ['sin(0)', 0],
    ['sin(30)', 0.5],
    ['sin(90)', 1],
    ['sin(180)', 0],
    ['sin(270)', -1],
    ['sin(360)', 0],
    ['cos(0)', 1],
    ['cos(60)', 0.5],
    ['cos(90)', 0],
    ['cos(180)', -1],
    ['cos(270)', 0],
    ['tan(0)', 0],
    ['tan(45)', 1],
    ['tan(180)', 0],
    ['tan(-45)', -1],
  ])('%s = %d', (input, expected) => {
    expect(value(input, 'deg')).toBeCloseTo(expected, 12)
  })

  it('returns exact zeros at the axes', () => {
    expect(value('sin(180)')).toBe(0)
    expect(value('cos(90)')).toBe(0)
    expect(value('cos(270)')).toBe(0)
    expect(value('sin(-180)')).toBe(0)
  })

  it('rejects tan at odd multiples of 90 degrees', () => {
    expect(errorOf('tan(90)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('tan(270)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('tan(-90)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('defaults to degrees', () => {
    expect(value('sin(30)')).toBeCloseTo(0.5, 12)
  })
})

describe('scientific: trigonometry in radians', () => {
  it('evaluates standard angles', () => {
    expect(value('sin(π/2)', 'rad')).toBeCloseTo(1, 12)
    expect(value('cos(0)', 'rad')).toBe(1)
    expect(value('tan(π/4)', 'rad')).toBeCloseTo(1, 12)
  })

  it('snaps floating-point noise at multiples of π to zero', () => {
    expect(value('sin(π)', 'rad')).toBe(0)
    expect(value('sin(2π)', 'rad')).toBe(0)
    expect(value('cos(π/2)', 'rad')).toBe(0)
    expect(value('tan(π)', 'rad')).toBe(0)
  })

  it('does not snap genuinely tiny results', () => {
    expect(value('sin(1e-12)', 'rad')).toBeCloseTo(1e-12, 20)
  })

  it('rejects tan at π/2', () => {
    expect(errorOf('tan(π/2)', undefined, 'rad').code).toBe(ErrorCode.DOMAIN_ERROR)
  })
})

describe('scientific: inverse trigonometry', () => {
  it('returns degrees in degree mode', () => {
    expect(value('asin(0.5)', 'deg')).toBeCloseTo(30, 10)
    expect(value('acos(0.5)', 'deg')).toBeCloseTo(60, 10)
    expect(value('atan(1)', 'deg')).toBeCloseTo(45, 10)
    expect(value('atan2(1,1)', 'deg')).toBeCloseTo(45, 10)
    expect(value('atan2(1,-1)', 'deg')).toBeCloseTo(135, 10)
  })

  it('returns radians in radian mode', () => {
    expect(value('asin(1)', 'rad')).toBeCloseTo(Math.PI / 2, 12)
    expect(value('acos(1)', 'rad')).toBe(0)
    expect(value('atan(1)', 'rad')).toBeCloseTo(Math.PI / 4, 12)
  })

  it('rejects arguments outside [-1, 1]', () => {
    expect(errorOf('asin(2)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('acos(-1.01)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('accepts the boundaries', () => {
    expect(value('asin(1)', 'deg')).toBeCloseTo(90, 10)
    expect(value('acos(-1)', 'deg')).toBeCloseTo(180, 10)
  })

  it('rejects atan2(0, 0)', () => {
    expect(errorOf('atan2(0,0)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })
})

describe('scientific: hyperbolic', () => {
  it('evaluates sinh, cosh and tanh', () => {
    expect(value('sinh(0)')).toBe(0)
    expect(value('cosh(0)')).toBe(1)
    expect(value('tanh(0)')).toBe(0)
    expect(value('sinh(1)')).toBeCloseTo(Math.sinh(1), 12)
    expect(value('tanh(100)')).toBe(1)
  })

  it('ignores the angle mode', () => {
    expect(value('sinh(1)', 'deg')).toBe(value('sinh(1)', 'rad'))
  })
})

describe('scientific: logarithms and exponentials', () => {
  it.each([
    ['log(1)', 0],
    ['log(10)', 1],
    ['log(1000)', 3],
    ['log(0.01)', -2],
    ['ln(1)', 0],
    ['ln(e)', 1],
    ['ln(e^3)', 3],
    ['log2(8)', 3],
    ['log2(1)', 0],
    ['log(8,2)', 3],
    ['log(81,3)', 4],
    ['exp(0)', 1],
    ['exp(1)', Math.E],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBeCloseTo(expected, 12)
  })

  it('returns exact results for exact powers of ten', () => {
    expect(value('log(1000)')).toBe(3)
    expect(value('log(1e-5)')).toBe(-5)
  })

  it('rejects non-positive arguments', () => {
    expect(errorOf('log(0)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('log(-1)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('ln(0)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('ln(-5)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('log2(0)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('rejects invalid bases', () => {
    expect(errorOf('log(8,1)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('log(8,0)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('log(8,-2)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })
})

describe('scientific: roots and powers', () => {
  it.each([
    ['sqrt(0)', 0],
    ['sqrt(144)', 12],
    ['sqrt(2)', Math.SQRT2],
    ['√144', 12],
    ['√(9+16)', 5],
    ['cbrt(27)', 3],
    ['cbrt(-27)', -3],
    ['pow(2,10)', 1024],
    ['pow(9,0.5)', 3],
    ['pow(2,-1)', 0.5],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBeCloseTo(expected, 12)
  })

  it('rejects the square root of a negative number', () => {
    expect(errorOf('sqrt(-1)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('√(-4)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('binds the radical to the following postfix expression', () => {
    expect(value('√16!')).toBeCloseTo(Math.sqrt(20922789888000), 6)
    expect(value('√4*3')).toBe(6)
    expect(value('2√9')).toBe(6)
  })
})

describe('scientific: rounding and aggregates', () => {
  it.each([
    ['abs(-5)', 5],
    ['abs(5)', 5],
    ['floor(2.7)', 2],
    ['floor(-2.1)', -3],
    ['ceil(2.1)', 3],
    ['ceil(-2.9)', -2],
    ['round(2.5)', 3],
    ['round(-2.5)', -3],
    ['round(2.4)', 2],
    ['round(3.14159,2)', 3.14],
    ['round(2.675,2)', 2.68],
    ['round(1.005,2)', 1.01],
    ['round(1234.5678,0)', 1235],
    ['min(3,1,2)', 1],
    ['max(3,1,2)', 3],
    ['max(7)', 7],
    ['mod(10,3)', 1],
    ['mod(-10,3)', -1],
    ['fact(5)', 120],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBe(expected)
  })

  it('rejects an invalid number of digits', () => {
    expect(errorOf('round(1.5,-1)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('round(1.5,0.5)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('round(1.5,16)').code).toBe(ErrorCode.DOMAIN_ERROR)
  })
})

describe('scientific: composition', () => {
  it('nests functions', () => {
    expect(value('sqrt(abs(-16))')).toBe(4)
    expect(value('sin(asin(0.5))')).toBeCloseTo(0.5, 12)
    expect(value('ln(exp(5))')).toBeCloseTo(5, 12)
  })

  it('mixes functions with operators', () => {
    expect(value('2*sin(30)+1')).toBeCloseTo(2, 12)
    expect(value('sin(30)^2+cos(30)^2')).toBeCloseTo(1, 12)
    expect(value('-sin(30)')).toBeCloseTo(-0.5, 12)
  })

  it('treats function names case-insensitively', () => {
    expect(value('SIN(30)')).toBeCloseTo(0.5, 12)
    expect(value('Sqrt(9)')).toBe(3)
  })
})

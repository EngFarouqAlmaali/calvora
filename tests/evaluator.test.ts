import { describe, expect, it } from 'vitest'
import { ErrorCode } from '@/core'
import { errorOf, scientific, standard, value } from './helpers'

describe('evaluator: arithmetic', () => {
  it.each([
    ['1+2', 3],
    ['10-4', 6],
    ['6*7', 42],
    ['20/4', 5],
    ['2^10', 1024],
    ['7+3*2', 13],
    ['(7+3)*2', 20],
    ['10-2-3', 5],
    ['100/10/5', 2],
    ['2^3^2', 512],
    ['2^-2', 0.25],
    ['0.5+0.25', 0.75],
    ['.5*4', 2],
    ['1e3+1', 1001],
    ['(125×3.5)+√144−18%', 4 * 0 + 125 * 3.5 + 12 - (125 * 3.5 + 12) * 0.18],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBeCloseTo(expected, 10)
  })

  it('evaluates implicit multiplication', () => {
    expect(value('2(3+4)')).toBe(14)
    expect(value('(1+2)(3+4)')).toBe(21)
    expect(value('2π')).toBeCloseTo(2 * Math.PI, 12)
  })

  it('works in standard mode with no functions defined', () => {
    const outcome = standard.evaluate('(250*4)+150')
    expect(outcome).toMatchObject({ ok: true, value: 1150, formatted: '1150' })
  })
})

describe('evaluator: unary operators', () => {
  it.each([
    ['-5', -5],
    ['+5', 5],
    ['--5', 5],
    ['-+-5', 5],
    ['3*-2', -6],
    ['3--2', 5],
    ['-2^2', -4],
    ['(-2)^2', 4],
    ['-(1+2)', -3],
    ['2*-(3)', -6],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBe(expected)
  })

  it('never produces negative zero', () => {
    expect(Object.is(value('-0'), 0)).toBe(true)
    expect(Object.is(value('0*-1'), 0)).toBe(true)
    expect(Object.is(value('-0+0'), 0)).toBe(true)
  })
})

describe('evaluator: percent', () => {
  it('divides by 100 on its own', () => {
    expect(value('50%')).toBe(0.5)
    expect(value('50%*200')).toBe(100)
    expect(value('200*10%')).toBe(20)
  })

  it('is relative to the left side after + and -', () => {
    expect(value('200+10%')).toBe(220)
    expect(value('200-10%')).toBe(180)
    expect(value('50+50%')).toBe(75)
  })

  it('applies to a whole left expression', () => {
    expect(value('100+100+10%')).toBe(220)
    expect(value('(100+100)+10%')).toBe(220)
  })

  it('takes a percentage of a parenthesised percent argument', () => {
    expect(value('200+(5+5)%')).toBe(220)
  })

  it('follows the documented example', () => {
    const base = 125 * 3.5 + 12
    expect(value('(125*3.5)+√144-18%')).toBeCloseTo(base * 0.82, 10)
  })

  it('stacks to divide by 10000', () => {
    expect(value('50%%')).toBeCloseTo(0.005, 12)
  })

  it('does not apply the relative rule inside multiplication', () => {
    expect(value('200*(1+10%)')).toBe(220)
  })
})

describe('evaluator: variables and constants', () => {
  it('resolves constants case-insensitively', () => {
    expect(value('PI')).toBeCloseTo(Math.PI, 12)
    expect(value('E')).toBeCloseTo(Math.E, 12)
    expect(value('π')).toBeCloseTo(Math.PI, 12)
    expect(value('tau')).toBeCloseTo(2 * Math.PI, 12)
  })

  it('resolves caller-supplied variables', () => {
    const outcome = scientific.evaluate('ans*2', { variables: { ans: 21 } })
    expect(outcome).toMatchObject({ ok: true, value: 42 })
  })

  it('lets variables shadow constants', () => {
    const outcome = scientific.evaluate('pi', { variables: { pi: 3 } })
    expect(outcome).toMatchObject({ ok: true, value: 3 })
  })

  it('ignores non-finite variables', () => {
    const outcome = scientific.evaluate('x', { variables: { x: Number.NaN } })
    expect(outcome.ok).toBe(false)
  })
})

describe('evaluator: division by zero', () => {
  it.each(['1/0', '0/0', '5/(2-2)', '1/0.0', '1/(1-1)'])('%s', (input) => {
    expect(errorOf(input).code).toBe(ErrorCode.DIVISION_BY_ZERO)
  })

  it('points at the divisor', () => {
    expect(errorOf('10/0')).toMatchObject({ start: 3, end: 4 })
  })

  it('reports zero to a negative power', () => {
    expect(errorOf('0^-1').code).toBe(ErrorCode.DIVISION_BY_ZERO)
  })

  it('allows zero divided by a number', () => {
    expect(value('0/5')).toBe(0)
  })

  it('reports modulo by zero', () => {
    expect(errorOf('mod(5,0)').code).toBe(ErrorCode.DIVISION_BY_ZERO)
  })

  it('has the same behaviour in standard mode', () => {
    expect(errorOf('1/0', standard).code).toBe(ErrorCode.DIVISION_BY_ZERO)
  })
})

describe('evaluator: domain errors and overflow', () => {
  it('rejects a negative base with a fractional exponent', () => {
    expect(errorOf('(-8)^(1/3)').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('(-1)^0.5').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('allows a negative base with an integer exponent', () => {
    expect(value('(-2)^3')).toBe(-8)
    expect(value('(-2)^-2')).toBe(0.25)
  })

  it('rejects overflow', () => {
    expect(errorOf('10^400').code).toBe(ErrorCode.OVERFLOW)
    expect(errorOf('1e308*10').code).toBe(ErrorCode.OVERFLOW)
    expect(errorOf('exp(1000)').code).toBe(ErrorCode.OVERFLOW)
  })

  it('rejects results that are not numbers', () => {
    expect(errorOf('0^0.5*(-1)^0.5').code).toBe(ErrorCode.DOMAIN_ERROR)
  })

  it('treats 0^0 as 1', () => {
    expect(value('0^0')).toBe(1)
  })
})

describe('evaluator: factorial', () => {
  it.each([
    ['0!', 1],
    ['1!', 1],
    ['5!', 120],
    ['10!', 3628800],
    ['3!!', 720],
    ['2*3!', 12],
    ['(2+3)!', 120],
  ])('%s = %d', (input, expected) => {
    expect(value(input)).toBe(expected)
  })

  it('handles the largest representable factorial', () => {
    expect(value('170!')).toBeGreaterThan(7e306)
  })

  it('rejects inputs that overflow, are negative or are fractional', () => {
    expect(errorOf('171!').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('(-1)!').code).toBe(ErrorCode.DOMAIN_ERROR)
    expect(errorOf('2.5!').code).toBe(ErrorCode.DOMAIN_ERROR)
  })
})

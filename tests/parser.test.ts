import { describe, expect, it } from 'vitest'
import { ErrorCode, MAX_NESTING_DEPTH, parseExpression, toSExpression } from '@/core'

const sexp = (input: string): string => toSExpression(parseExpression(input))

function parseError(input: string): { code: string; start: number; end: number } {
  try {
    parseExpression(input)
  } catch (error) {
    const e = error as { code: string; start: number; end: number }
    return { code: e.code, start: e.start, end: e.end }
  }
  throw new Error(`"${input}" did not fail`)
}

describe('parser: AST generation', () => {
  it('parses a number', () => {
    expect(parseExpression('42')).toMatchObject({ kind: 'Number', value: 42 })
  })

  it('parses an identifier in lower case', () => {
    expect(parseExpression('PI')).toMatchObject({ kind: 'Identifier', name: 'pi' })
  })

  it('parses a binary node with children', () => {
    expect(parseExpression('1+2')).toMatchObject({
      kind: 'Binary',
      op: '+',
      implicit: false,
      left: { kind: 'Number', value: 1 },
      right: { kind: 'Number', value: 2 },
    })
  })

  it('parses a call node with arguments', () => {
    expect(parseExpression('max(1,2,3)')).toMatchObject({
      kind: 'Call',
      callee: 'max',
      args: [{ value: 1 }, { value: 2 }, { value: 3 }],
    })
  })

  it('parses a call with no arguments', () => {
    expect(parseExpression('f()')).toMatchObject({ kind: 'Call', callee: 'f', args: [] })
  })

  it('maps the radical sign to sqrt', () => {
    expect(sexp('√9')).toBe('(call sqrt 9)')
  })

  it('does not create nodes for parentheses', () => {
    expect(parseExpression('((7))')).toMatchObject({ kind: 'Number', value: 7 })
  })

  it('records source spans', () => {
    expect(parseExpression('12 + 345').span).toEqual({ start: 0, end: 8 })
    expect(parseExpression('(1)').span).toEqual({ start: 0, end: 3 })
    expect(parseExpression('sin(30)').span).toEqual({ start: 0, end: 7 })
  })
})

describe('parser: operator precedence', () => {
  it('multiplies before adding', () => {
    expect(sexp('1+2*3')).toBe('(+ 1 (* 2 3))')
    expect(sexp('1*2+3')).toBe('(+ (* 1 2) 3)')
  })

  it('divides before subtracting', () => {
    expect(sexp('10-6/2')).toBe('(- 10 (/ 6 2))')
  })

  it('applies exponents before multiplication', () => {
    expect(sexp('2*3^2')).toBe('(* 2 (^ 3 2))')
  })

  it('is left-associative for + and -', () => {
    expect(sexp('1-2-3')).toBe('(- (- 1 2) 3)')
    expect(sexp('1-2+3')).toBe('(+ (- 1 2) 3)')
  })

  it('is left-associative for * and /', () => {
    expect(sexp('8/4/2')).toBe('(/ (/ 8 4) 2)')
    expect(sexp('8/4*2')).toBe('(* (/ 8 4) 2)')
  })

  it('is right-associative for ^', () => {
    expect(sexp('2^3^2')).toBe('(^ 2 (^ 3 2))')
  })

  it('binds postfix operators tighter than ^', () => {
    expect(sexp('2^3!')).toBe('(^ 2 (! 3))')
    expect(sexp('50%^2')).toBe('(^ (% 50) 2)')
  })

  it('lets postfix operators chain', () => {
    expect(sexp('3!!')).toBe('(! (! 3))')
    expect(sexp('50%%')).toBe('(% (% 50))')
  })
})

describe('parser: parentheses', () => {
  it('overrides precedence', () => {
    expect(sexp('(1+2)*3')).toBe('(* (+ 1 2) 3)')
    expect(sexp('2*(3+4)')).toBe('(* 2 (+ 3 4))')
  })

  it('handles nesting', () => {
    expect(sexp('((1+2)*(3+4))')).toBe('(* (+ 1 2) (+ 3 4))')
  })

  it('allows nested calls', () => {
    expect(sexp('sin(cos(0))')).toBe('(call sin (call cos 0))')
  })

  it('allows full expressions as call arguments', () => {
    expect(sexp('pow(1+1, 2*3)')).toBe('(call pow (+ 1 1) (* 2 3))')
  })
})

describe('parser: unary operators', () => {
  it('parses unary minus and plus', () => {
    expect(sexp('-5')).toBe('(neg 5)')
    expect(sexp('+5')).toBe('(pos 5)')
  })

  it('stacks unary operators', () => {
    expect(sexp('--5')).toBe('(neg (neg 5))')
    expect(sexp('-+-5')).toBe('(neg (pos (neg 5)))')
  })

  it('parses a negative operand of a binary operator', () => {
    expect(sexp('3*-2')).toBe('(* 3 (neg 2))')
    expect(sexp('3--2')).toBe('(- 3 (neg 2))')
  })

  it('makes unary minus bind looser than ^', () => {
    expect(sexp('-2^2')).toBe('(neg (^ 2 2))')
  })

  it('allows a signed exponent', () => {
    expect(sexp('2^-2')).toBe('(^ 2 (neg 2))')
  })

  it('binds unary minus tighter than multiplication', () => {
    expect(sexp('-2*3')).toBe('(* (neg 2) 3)')
  })

  it('applies unary minus to a parenthesised expression', () => {
    expect(sexp('-(1+2)')).toBe('(neg (+ 1 2))')
  })
})

describe('parser: implicit multiplication', () => {
  it('multiplies a number and a parenthesis', () => {
    expect(sexp('2(3+4)')).toBe('(* 2 (+ 3 4))')
  })

  it('multiplies adjacent parentheses', () => {
    expect(sexp('(1+2)(3+4)')).toBe('(* (+ 1 2) (+ 3 4))')
  })

  it('multiplies a number and an identifier', () => {
    expect(sexp('2π')).toBe('(* 2 π)')
  })

  it('multiplies a number and a call', () => {
    expect(sexp('2sin(30)')).toBe('(* 2 (call sin 30))')
  })

  it('flags implicit multiplication', () => {
    expect(parseExpression('2(3)')).toMatchObject({ kind: 'Binary', op: '*', implicit: true })
    expect(parseExpression('2*3')).toMatchObject({ kind: 'Binary', op: '*', implicit: false })
  })

  it('does not treat adjacent numbers as multiplication', () => {
    expect(parseError('2 3').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
  })
})

describe('parser: errors', () => {
  it('rejects an empty expression', () => {
    expect(parseError('').code).toBe(ErrorCode.EMPTY_EXPRESSION)
    expect(parseError('   ').code).toBe(ErrorCode.EMPTY_EXPRESSION)
  })

  it('rejects a missing right operand', () => {
    expect(parseError('1+')).toMatchObject({ code: ErrorCode.UNEXPECTED_END, start: 2 })
    expect(parseError('1*')).toMatchObject({ code: ErrorCode.UNEXPECTED_END })
  })

  it('rejects a missing left operand', () => {
    expect(parseError('*3')).toMatchObject({ code: ErrorCode.UNEXPECTED_TOKEN, start: 0 })
    expect(parseError('/3').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
  })

  it('rejects consecutive binary operators', () => {
    expect(parseError('1+*2')).toMatchObject({ code: ErrorCode.UNEXPECTED_TOKEN, start: 2 })
    expect(parseError('1**2').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
  })

  it('points at the opening parenthesis when one is not closed', () => {
    expect(parseError('(1+2')).toMatchObject({ code: ErrorCode.MISSING_CLOSING_PAREN, start: 0 })
    expect(parseError('2*(1+(3')).toMatchObject({ code: ErrorCode.MISSING_CLOSING_PAREN, start: 5 })
    expect(parseError('sin(30')).toMatchObject({ code: ErrorCode.MISSING_CLOSING_PAREN, start: 3 })
  })

  it('reports an unmatched closing parenthesis', () => {
    expect(parseError('1+2)')).toMatchObject({ code: ErrorCode.UNMATCHED_CLOSING_PAREN, start: 3 })
  })

  it('rejects empty parentheses', () => {
    expect(parseError('()')).toMatchObject({ code: ErrorCode.UNEXPECTED_TOKEN, start: 1 })
  })

  it('rejects trailing commas and stray commas', () => {
    expect(parseError('max(1,)').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
    expect(parseError('1,2').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
  })

  it('rejects a postfix operator with nothing before it', () => {
    expect(parseError('%')).toMatchObject({ code: ErrorCode.UNEXPECTED_TOKEN, start: 0 })
    expect(parseError('!5').code).toBe(ErrorCode.UNEXPECTED_TOKEN)
  })

  it('uses 1-based positions in messages', () => {
    expect(() => parseExpression('1+*2')).toThrow(/position 3/)
  })

  it('rejects absurd nesting instead of overflowing the stack', () => {
    const depth = MAX_NESTING_DEPTH + 10
    expect(parseError('('.repeat(depth) + '1' + ')'.repeat(depth)).code).toBe(
      ErrorCode.NESTING_TOO_DEEP,
    )
    expect(parseError('-'.repeat(depth) + '1').code).toBe(ErrorCode.NESTING_TOO_DEEP)
  })

  it('accepts nesting just inside the limit', () => {
    const depth = MAX_NESTING_DEPTH - 2
    expect(() => parseExpression('('.repeat(depth) + '1' + ')'.repeat(depth))).not.toThrow()
  })
})

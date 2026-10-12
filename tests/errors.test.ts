import { describe, expect, it } from 'vitest'
import { ErrorCode, MAX_EXPRESSION_LENGTH, createEngine, toErrorInfo, CalvoraError } from '@/core'
import { errorOf, scientific, standard } from './helpers'

describe('errors: unknown functions and identifiers', () => {
  it('reports unknown functions with the name span', () => {
    expect(errorOf('foo(1)')).toMatchObject({
      code: ErrorCode.UNKNOWN_FUNCTION,
      phase: 'validate',
      start: 0,
      end: 3,
    })
    expect(errorOf('1+bar(2)')).toMatchObject({ code: ErrorCode.UNKNOWN_FUNCTION, start: 2, end: 5 })
  })

  it('names the function in the message', () => {
    expect(errorOf('foo(1)').message).toBe("Unknown function 'foo'.")
  })

  it('reports unknown identifiers', () => {
    expect(errorOf('x+1')).toMatchObject({ code: ErrorCode.UNKNOWN_IDENTIFIER, start: 0, end: 1 })
  })

  it('reports a bare function name', () => {
    expect(errorOf('sin')).toMatchObject({ code: ErrorCode.FUNCTION_NEEDS_PARENS })
    expect(errorOf('2+sqrt')).toMatchObject({ code: ErrorCode.FUNCTION_NEEDS_PARENS, start: 2 })
  })

  it('reports calling a constant', () => {
    expect(errorOf('pi(2)')).toMatchObject({ code: ErrorCode.NOT_A_FUNCTION, start: 0, end: 2 })
  })

  it('rejects functions in standard mode', () => {
    expect(errorOf('sin(30)', standard).code).toBe(ErrorCode.UNKNOWN_FUNCTION)
    expect(errorOf('pi', standard).code).toBe(ErrorCode.UNKNOWN_IDENTIFIER)
  })

  it('reports the first problem in source order', () => {
    expect(errorOf('foo(1)+bar(2)').message).toContain("'foo'")
  })

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'prototype'])(
    'never resolves the inherited name %s',
    (name) => {
      expect(errorOf(name).code).toBe(ErrorCode.UNKNOWN_IDENTIFIER)
      expect(errorOf(`${name}(1)`).code).toBe(ErrorCode.UNKNOWN_FUNCTION)
    },
  )

  it('ignores inherited names passed as variables', () => {
    const outcome = scientific.evaluate('constructor', { variables: JSON.parse('{"x":1}') })
    expect(outcome.ok).toBe(false)
  })
})

describe('errors: argument counts', () => {
  it('rejects too few arguments', () => {
    expect(errorOf('sin()')).toMatchObject({ code: ErrorCode.WRONG_ARGUMENT_COUNT })
    expect(errorOf('pow(2)').message).toBe('pow() expects 2 arguments but received 1.')
  })

  it('rejects too many arguments', () => {
    expect(errorOf('sin(1,2)').message).toBe('sin() expects 1 argument but received 2.')
    expect(errorOf('log(1,2,3)').message).toBe('log() expects 1 to 2 arguments but received 3.')
  })

  it('describes variadic functions', () => {
    expect(errorOf('min()').message).toBe('min() expects at least 1 argument but received 0.')
  })

  it('points at the whole call', () => {
    expect(errorOf('1+pow(2)')).toMatchObject({ start: 2, end: 8 })
  })
})

describe('errors: invalid expressions', () => {
  it.each([
    ['', ErrorCode.EMPTY_EXPRESSION],
    ['   ', ErrorCode.EMPTY_EXPRESSION],
    ['1+', ErrorCode.UNEXPECTED_END],
    ['*1', ErrorCode.UNEXPECTED_TOKEN],
    ['1++*2', ErrorCode.UNEXPECTED_TOKEN],
    ['(1+2', ErrorCode.MISSING_CLOSING_PAREN],
    ['1+2)', ErrorCode.UNMATCHED_CLOSING_PAREN],
    ['1 $ 2', ErrorCode.UNEXPECTED_CHARACTER],
    ['1.2.3', ErrorCode.INVALID_NUMBER],
    ['2 3', ErrorCode.UNEXPECTED_TOKEN],
    ['()', ErrorCode.UNEXPECTED_TOKEN],
    ['1e999', ErrorCode.INVALID_NUMBER],
  ])('%j → %s', (input, code) => {
    expect(errorOf(input).code).toBe(code)
  })

  it('tags each error with the phase that produced it', () => {
    expect(errorOf('$').phase).toBe('lex')
    expect(errorOf('1+').phase).toBe('parse')
    expect(errorOf('foo(1)').phase).toBe('validate')
    expect(errorOf('1/0').phase).toBe('evaluate')
  })

  it('reports 1-based positions in messages', () => {
    expect(errorOf('1 + $').message).toBe("Unexpected character '$' at position 5.")
  })

  it('rejects over-long input', () => {
    expect(errorOf('1+'.repeat(MAX_EXPRESSION_LENGTH)).code).toBe(ErrorCode.EXPRESSION_TOO_LONG)
  })
})

describe('errors: robustness', () => {
  it('never throws, whatever the input', () => {
    const inputs = [
      '', ' ', '(', ')', '((((', '))))', '+', '-', '*', '.', '..', 'e', '1e', '!', '%', '√', ',',
      '1,2', 'sin(', 'sin)', 'sin(,)', '\u0000', '\n', '😀', '1/0', '0^-1', '9'.repeat(400),
      '('.repeat(500), '-'.repeat(500), 'sin('.repeat(200),
    ]
    for (const input of inputs) {
      expect(() => scientific.evaluate(input)).not.toThrow()
    }
  })

  it('returns structured failures with sane offsets', () => {
    const inputs = ['1+', '(1', '$', 'foo(1)', '1/0', '2 3']
    for (const input of inputs) {
      const { start, end } = errorOf(input)
      expect(start).toBeGreaterThanOrEqual(0)
      expect(end).toBeGreaterThanOrEqual(start)
      expect(end).toBeLessThanOrEqual(input.length)
    }
  })

  it('reports unknown thrown values generically without leaking details', () => {
    const info = toErrorInfo(new TypeError('secret internal detail'))
    expect(info.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(info.message).not.toContain('secret')
  })

  it('converts a faulty custom function into a generic internal error', () => {
    const engine = createEngine({
      functions: [
        {
          name: 'boom',
          minArgs: 0,
          maxArgs: 0,
          evaluate: () => {
            throw new Error('kaboom')
          },
        },
      ],
    })
    const outcome = engine.evaluate('boom()')
    expect(outcome).toMatchObject({ ok: false, error: { code: ErrorCode.INTERNAL_ERROR } })
    expect(JSON.stringify(outcome)).not.toContain('kaboom')
  })

  it('preserves error class and fields', () => {
    const error = new CalvoraError('parse', ErrorCode.UNEXPECTED_TOKEN, 'msg', 2, 5)
    expect(error.toInfo()).toEqual({
      code: ErrorCode.UNEXPECTED_TOKEN,
      phase: 'parse',
      message: 'msg',
      start: 2,
      end: 5,
    })
  })
})

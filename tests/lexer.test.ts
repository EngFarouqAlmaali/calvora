import { describe, expect, it } from 'vitest'
import { ErrorCode, MAX_EXPRESSION_LENGTH, TokenType, tokenize } from '@/core'
import type { Token } from '@/core'

const types = (input: string): string[] => tokenize(input).map((t) => t.type)
const lexemes = (input: string): string[] =>
  tokenize(input)
    .filter((t) => t.type !== TokenType.EOF)
    .map((t) => t.lexeme)

function lexError(input: string): { code: string; start: number; end: number } {
  try {
    tokenize(input)
  } catch (error) {
    const e = error as { code: string; start: number; end: number }
    return { code: e.code, start: e.start, end: e.end }
  }
  throw new Error(`"${input}" did not fail`)
}

describe('lexer: tokenization', () => {
  it('always ends with a single EOF token', () => {
    expect(types('')).toEqual([TokenType.EOF])
    expect(types('1')).toEqual([TokenType.Number, TokenType.EOF])
  })

  it('tokenizes a full arithmetic expression', () => {
    expect(types('(1+2)*3')).toEqual([
      TokenType.LParen,
      TokenType.Number,
      TokenType.Plus,
      TokenType.Number,
      TokenType.RParen,
      TokenType.Star,
      TokenType.Number,
      TokenType.EOF,
    ])
  })

  it('ignores whitespace of every kind', () => {
    expect(lexemes(' 1 \t+\n 2 ')).toEqual(['1', '+', '2'])
  })

  it('records exact start and end offsets', () => {
    const [a, plus, b] = tokenize('12 + 345') as [Token, Token, Token]
    expect([a.start, a.end]).toEqual([0, 2])
    expect([plus.start, plus.end]).toEqual([3, 4])
    expect([b.start, b.end]).toEqual([5, 8])
  })

  it('places EOF at the end of the input', () => {
    const tokens = tokenize('1 + 2  ')
    const eof = tokens[tokens.length - 1] as Token
    expect(eof.start).toBe(7)
  })

  it('tokenizes every operator and punctuation mark', () => {
    expect(types('+-*/^%!(),')).toEqual([
      TokenType.Plus,
      TokenType.Minus,
      TokenType.Star,
      TokenType.Slash,
      TokenType.Caret,
      TokenType.Percent,
      TokenType.Bang,
      TokenType.LParen,
      TokenType.RParen,
      TokenType.Comma,
      TokenType.EOF,
    ])
  })

  it('normalises Unicode operators', () => {
    expect(types('1×2÷3−4')).toEqual([
      TokenType.Number,
      TokenType.Star,
      TokenType.Number,
      TokenType.Slash,
      TokenType.Number,
      TokenType.Minus,
      TokenType.Number,
      TokenType.EOF,
    ])
  })

  it('tokenizes the radical sign', () => {
    expect(types('√9')).toEqual([TokenType.Radical, TokenType.Number, TokenType.EOF])
  })
})

describe('lexer: numbers', () => {
  it.each([
    ['0', 0],
    ['42', 42],
    ['3.14', 3.14],
    ['.5', 0.5],
    ['5.', 5],
    ['1e3', 1000],
    ['1E3', 1000],
    ['1.5e-3', 0.0015],
    ['2e+2', 200],
    ['007', 7],
  ])('parses %s as %d', (source, expected) => {
    const token = tokenize(source)[0] as Token
    expect(token.type).toBe(TokenType.Number)
    expect(token.type === TokenType.Number && token.value).toBe(expected)
    expect(token.lexeme).toBe(source)
  })

  it('treats an exponent marker without digits as the constant e', () => {
    expect(lexemes('2e')).toEqual(['2', 'e'])
    expect(types('2e')).toEqual([TokenType.Number, TokenType.Identifier, TokenType.EOF])
    expect(lexemes('2e+')).toEqual(['2', 'e', '+'])
  })

  it('rejects a lone decimal point', () => {
    expect(lexError('.')).toMatchObject({ code: ErrorCode.INVALID_NUMBER, start: 0 })
  })

  it('rejects a second decimal point', () => {
    expect(lexError('1.2.3')).toMatchObject({ code: ErrorCode.INVALID_NUMBER })
  })

  it('rejects numbers too large for a double', () => {
    expect(lexError('1e999')).toMatchObject({ code: ErrorCode.INVALID_NUMBER })
  })
})

describe('lexer: identifiers', () => {
  it('reads letters, digits and underscores', () => {
    expect(lexemes('log2 my_var')).toEqual(['log2', 'my_var'])
  })

  it('does not start an identifier with a digit', () => {
    expect(lexemes('2x')).toEqual(['2', 'x'])
  })

  it('reads each Greek constant as its own identifier', () => {
    expect(lexemes('2πτ')).toEqual(['2', 'π', 'τ'])
  })

  it('preserves original case in the lexeme', () => {
    expect(lexemes('SIN')).toEqual(['SIN'])
  })
})

describe('lexer: errors', () => {
  it('reports unexpected characters with position', () => {
    expect(lexError('1 + $')).toEqual({ code: ErrorCode.UNEXPECTED_CHARACTER, start: 4, end: 5 })
  })

  it.each(['#', '@', '&', '=', '[', '{', ';', '"', '\\'])('rejects %s', (ch) => {
    expect(lexError(`1${ch}2`).code).toBe(ErrorCode.UNEXPECTED_CHARACTER)
  })

  it('reports astral characters as one unit', () => {
    expect(lexError('1+😀')).toEqual({ code: ErrorCode.UNEXPECTED_CHARACTER, start: 2, end: 4 })
  })

  it('rejects expressions over the length limit', () => {
    expect(lexError('1'.repeat(MAX_EXPRESSION_LENGTH + 1)).code).toBe(ErrorCode.EXPRESSION_TOO_LONG)
  })

  it('accepts expressions exactly at the length limit', () => {
    expect(() => tokenize('1' + ' '.repeat(MAX_EXPRESSION_LENGTH - 1))).not.toThrow()
  })
})

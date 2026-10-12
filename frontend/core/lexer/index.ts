import { ErrorCode, LexError, displayPosition } from '../errors'
import { MAX_EXPRESSION_LENGTH } from '../limits'
import { TokenType } from './token'
import type { SimpleToken, Token } from './token'

export { TokenType } from './token'
export type { NumberToken, SimpleToken, Token } from './token'

/** Single-character operators, including the Unicode forms people paste in. */
const SIMPLE_TOKENS: Readonly<Record<string, SimpleToken['type']>> = {
  '+': TokenType.Plus,
  '-': TokenType.Minus,
  '−': TokenType.Minus, // −
  '*': TokenType.Star,
  '×': TokenType.Star, // ×
  '/': TokenType.Slash,
  '÷': TokenType.Slash, // ÷
  '^': TokenType.Caret,
  '%': TokenType.Percent,
  '!': TokenType.Bang,
  '(': TokenType.LParen,
  ')': TokenType.RParen,
  ',': TokenType.Comma,
  '√': TokenType.Radical, // √
}

/** Greek constants are always single-character identifiers, so `2πr` is `2 * π * r`. */
const GREEK_IDENTIFIERS = new Set(['π', 'τ']) // π τ

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9'
}

function isIdentifierStart(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_')
}

function isIdentifierPart(ch: string | undefined): boolean {
  return isIdentifierStart(ch) || isDigit(ch)
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch)
}

/**
 * Convert source text into tokens. The returned list always ends with an
 * `EOF` token. Throws `LexError` for characters or numbers that cannot be
 * tokenised.
 */
export function tokenize(input: string): Token[] {
  if (input.length > MAX_EXPRESSION_LENGTH) {
    throw new LexError(
      ErrorCode.EXPRESSION_TOO_LONG,
      `Expression is too long (limit is ${MAX_EXPRESSION_LENGTH} characters).`,
      MAX_EXPRESSION_LENGTH,
      input.length,
    )
  }

  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input.charAt(i)

    if (isWhitespace(ch)) {
      i += 1
      continue
    }

    if (isDigit(ch) || ch === '.') {
      i = scanNumber(input, i, tokens)
      continue
    }

    const simple = SIMPLE_TOKENS[ch]
    if (simple !== undefined) {
      tokens.push({ type: simple, lexeme: ch, start: i, end: i + 1 })
      i += 1
      continue
    }

    if (GREEK_IDENTIFIERS.has(ch)) {
      tokens.push({ type: TokenType.Identifier, lexeme: ch, start: i, end: i + 1 })
      i += 1
      continue
    }

    if (isIdentifierStart(ch)) {
      let j = i + 1
      while (isIdentifierPart(input.charAt(j)) && j < input.length) j += 1
      tokens.push({ type: TokenType.Identifier, lexeme: input.slice(i, j), start: i, end: j })
      i = j
      continue
    }

    const codePoint = input.codePointAt(i)
    const text = codePoint === undefined ? ch : String.fromCodePoint(codePoint)
    throw new LexError(
      ErrorCode.UNEXPECTED_CHARACTER,
      `Unexpected character '${text}' at position ${displayPosition(i)}.`,
      i,
      i + text.length,
    )
  }

  tokens.push({ type: TokenType.EOF, lexeme: '', start: input.length, end: input.length })
  return tokens
}

/**
 * Scan a number literal starting at `start`, push its token, and return the
 * offset just past it. Accepts `12`, `3.5`, `.5`, `1.`, `1e5`, `1.5E-3`.
 * An `e` only starts an exponent when digits follow, so `2e` is `2 * e`.
 */
function scanNumber(input: string, start: number, tokens: Token[]): number {
  let i = start
  let digits = 0

  while (isDigit(input.charAt(i))) {
    i += 1
    digits += 1
  }

  if (input.charAt(i) === '.') {
    i += 1
    while (isDigit(input.charAt(i))) {
      i += 1
      digits += 1
    }
  }

  if (digits === 0) {
    throw new LexError(
      ErrorCode.INVALID_NUMBER,
      `Invalid number at position ${displayPosition(start)}.`,
      start,
      i,
    )
  }

  if (input.charAt(i) === '.') {
    throw new LexError(
      ErrorCode.INVALID_NUMBER,
      `Invalid number: unexpected second decimal point at position ${displayPosition(i)}.`,
      start,
      i + 1,
    )
  }

  const marker = input.charAt(i)
  if (marker === 'e' || marker === 'E') {
    let j = i + 1
    const sign = input.charAt(j)
    if (sign === '+' || sign === '-') j += 1
    if (isDigit(input.charAt(j))) {
      while (isDigit(input.charAt(j))) j += 1
      i = j
    }
  }

  const lexeme = input.slice(start, i)
  const value = Number(lexeme)
  if (!Number.isFinite(value)) {
    throw new LexError(
      ErrorCode.INVALID_NUMBER,
      `Number at position ${displayPosition(start)} is too large.`,
      start,
      i,
    )
  }

  tokens.push({ type: TokenType.Number, lexeme, start, end: i, value })
  return i
}

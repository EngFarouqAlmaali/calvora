/**
 * Domain-specific errors for the CALVORA engine.
 *
 * Every failure the engine can report is a `CalvoraError` carrying a stable
 * machine-readable `code`, the pipeline `phase` that produced it, and the
 * half-open character range `[start, end)` of the input it refers to
 * (0-based). Messages shown to people use 1-based positions.
 */

export const ErrorCode = {
  EMPTY_EXPRESSION: 'EMPTY_EXPRESSION',
  EXPRESSION_TOO_LONG: 'EXPRESSION_TOO_LONG',
  UNEXPECTED_CHARACTER: 'UNEXPECTED_CHARACTER',
  INVALID_NUMBER: 'INVALID_NUMBER',
  UNEXPECTED_TOKEN: 'UNEXPECTED_TOKEN',
  UNEXPECTED_END: 'UNEXPECTED_END',
  MISSING_CLOSING_PAREN: 'MISSING_CLOSING_PAREN',
  UNMATCHED_CLOSING_PAREN: 'UNMATCHED_CLOSING_PAREN',
  NESTING_TOO_DEEP: 'NESTING_TOO_DEEP',
  UNKNOWN_FUNCTION: 'UNKNOWN_FUNCTION',
  UNKNOWN_IDENTIFIER: 'UNKNOWN_IDENTIFIER',
  NOT_A_FUNCTION: 'NOT_A_FUNCTION',
  FUNCTION_NEEDS_PARENS: 'FUNCTION_NEEDS_PARENS',
  WRONG_ARGUMENT_COUNT: 'WRONG_ARGUMENT_COUNT',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  DOMAIN_ERROR: 'DOMAIN_ERROR',
  OVERFLOW: 'OVERFLOW',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export type ErrorPhase = 'lex' | 'parse' | 'validate' | 'evaluate' | 'internal'

/** Plain, serialisable description of an error. Safe to hand to the UI. */
export interface ErrorInfo {
  readonly code: ErrorCode
  readonly phase: ErrorPhase
  readonly message: string
  /** Inclusive 0-based start offset into the input. */
  readonly start: number
  /** Exclusive 0-based end offset into the input. */
  readonly end: number
}

/** Convert a 0-based offset into the 1-based position shown to people. */
export function displayPosition(offset: number): number {
  return offset + 1
}

export class CalvoraError extends Error {
  readonly code: ErrorCode
  readonly phase: ErrorPhase
  readonly start: number
  readonly end: number

  constructor(phase: ErrorPhase, code: ErrorCode, message: string, start = 0, end = start) {
    super(message)
    this.name = 'CalvoraError'
    this.phase = phase
    this.code = code
    this.start = start
    this.end = Math.max(start, end)
  }

  toInfo(): ErrorInfo {
    return {
      code: this.code,
      phase: this.phase,
      message: this.message,
      start: this.start,
      end: this.end,
    }
  }
}

export class LexError extends CalvoraError {
  constructor(code: ErrorCode, message: string, start: number, end = start + 1) {
    super('lex', code, message, start, end)
    this.name = 'LexError'
  }
}

export class ParseError extends CalvoraError {
  constructor(code: ErrorCode, message: string, start: number, end = start + 1) {
    super('parse', code, message, start, end)
    this.name = 'ParseError'
  }
}

export class ValidationError extends CalvoraError {
  constructor(code: ErrorCode, message: string, start: number, end = start + 1) {
    super('validate', code, message, start, end)
    this.name = 'ValidationError'
  }
}

export class EvaluationError extends CalvoraError {
  constructor(code: ErrorCode, message: string, start: number, end = start + 1) {
    super('evaluate', code, message, start, end)
    this.name = 'EvaluationError'
  }
}

/**
 * Thrown by pure numeric helpers and function implementations, which know
 * nothing about source positions. The evaluator catches it and rethrows an
 * `EvaluationError` carrying the span of the node that failed.
 */
export class MathError extends Error {
  readonly code: typeof ErrorCode.DOMAIN_ERROR | typeof ErrorCode.DIVISION_BY_ZERO | typeof ErrorCode.OVERFLOW

  constructor(
    code: typeof ErrorCode.DOMAIN_ERROR | typeof ErrorCode.DIVISION_BY_ZERO | typeof ErrorCode.OVERFLOW,
    message: string,
  ) {
    super(message)
    this.name = 'MathError'
    this.code = code
  }
}

/**
 * Normalise anything thrown inside the pipeline into an `ErrorInfo`.
 * Unknown errors are reported generically so internals never leak to the UI.
 */
export function toErrorInfo(error: unknown): ErrorInfo {
  if (error instanceof CalvoraError) return error.toInfo()
  return {
    code: ErrorCode.INTERNAL_ERROR,
    phase: 'internal',
    message: 'An unexpected internal error occurred.',
    start: 0,
    end: 0,
  }
}

/**
 * Public surface of the CALVORA computational core. Nothing under
 * `frontend/core/` imports Vue, the DOM, or any browser API.
 */
export { createEngine } from './engine'
export type {
  Engine,
  EngineOptions,
  EvaluateOptions,
  EvaluationFailure,
  EvaluationOutcome,
  EvaluationSuccess,
} from './engine'

export { toSExpression } from './ast'
export type { Expr, Span } from './ast'

export { tokenize, TokenType } from './lexer'
export type { Token } from './lexer'

export { parse, parseExpression } from './parser'
export { validate } from './validation'
export { evaluate } from './evaluator'
export type { AngleMode, Environment, FunctionContext, FunctionDefinition } from './evaluator'

export { formatNumber } from './format'

export { CalvoraError, ErrorCode, displayPosition, MathError, toErrorInfo } from './errors'
export type { ErrorInfo, ErrorPhase } from './errors'

export { MAX_EXPRESSION_LENGTH, MAX_NESTING_DEPTH } from './limits'

import type { Expr } from './ast'
import { toErrorInfo } from './errors'
import type { ErrorInfo } from './errors'
import { evaluate } from './evaluator'
import type { AngleMode, Environment, FunctionDefinition } from './evaluator'
import { formatNumber } from './format'
import { tokenize } from './lexer'
import { parse } from './parser'
import { validate } from './validation'

export interface EngineOptions {
  /** Functions callable from expressions. Names are matched case-insensitively. */
  readonly functions?: readonly FunctionDefinition[]
  /** Named constants such as `pi`. Names are matched case-insensitively. */
  readonly constants?: Readonly<Record<string, number>>
}

export interface EvaluateOptions {
  /** Extra read-only values for this evaluation only, e.g. `{ ans: 42 }`. */
  readonly variables?: Readonly<Record<string, number>>
  /** Unit for trigonometric functions. Defaults to `'deg'`. */
  readonly angleMode?: AngleMode
}

export interface EvaluationSuccess {
  readonly ok: true
  readonly value: number
  /** `value` rounded and formatted for display. */
  readonly formatted: string
  readonly ast: Expr
}

export interface EvaluationFailure {
  readonly ok: false
  readonly error: ErrorInfo
}

export type EvaluationOutcome = EvaluationSuccess | EvaluationFailure

export interface Engine {
  /**
   * Run the full pipeline: lex → parse → validate → evaluate. Never throws;
   * every failure is returned as a structured `ErrorInfo`.
   */
  evaluate(input: string, options?: EvaluateOptions): EvaluationOutcome
  readonly functionNames: readonly string[]
  readonly constantNames: readonly string[]
}

function toMap(values: Readonly<Record<string, number>> | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (values === undefined) return map
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'number' && Number.isFinite(value)) map.set(name.toLowerCase(), value)
  }
  return map
}

/**
 * Build an engine around a fixed set of functions and constants. The engine is
 * stateless between calls, so one instance can be shared freely.
 */
export function createEngine(options: EngineOptions = {}): Engine {
  const functions = new Map<string, FunctionDefinition>()
  for (const definition of options.functions ?? []) {
    functions.set(definition.name.toLowerCase(), definition)
  }
  const constants = toMap(options.constants)

  return {
    functionNames: [...functions.keys()],
    constantNames: [...constants.keys()],

    evaluate(input, evaluateOptions = {}) {
      try {
        const ast = parse(tokenize(input))
        const environment: Environment = {
          functions,
          constants,
          variables: toMap(evaluateOptions.variables),
          angleMode: evaluateOptions.angleMode ?? 'deg',
        }
        validate(ast, environment)
        const value = evaluate(ast, environment)
        return { ok: true, value, formatted: formatNumber(value), ast }
      } catch (error) {
        // Unknown failures are reported generically; internals are never echoed.
        return { ok: false, error: toErrorInfo(error) }
      }
    },
  }
}

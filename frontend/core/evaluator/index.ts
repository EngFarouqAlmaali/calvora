import type { BinaryNode, Expr, Span } from '../ast'
import { ErrorCode, EvaluationError, MathError } from '../errors'
import type { Environment } from './environment'
import { divide, ensureReal, factorial, power } from './numeric'

export type { AngleMode, Environment, FunctionContext, FunctionDefinition } from './environment'
export { cleanFloat } from './numeric'

/**
 * Evaluate a validated tree to a number.
 *
 * Every arithmetic result passes through `ensureReal`, so NaN and infinity
 * become typed errors with the span of the offending node instead of leaking
 * out as numbers.
 *
 * Percent has one context-sensitive rule, matching handheld calculators: when
 * a `%` expression is the right-hand side of `+` or `-`, it means a percentage
 * *of the left-hand side* (`200 + 10%` is `220`). Everywhere else `x%` is
 * simply `x / 100`.
 */
export function evaluate(node: Expr, env: Environment): number {
  switch (node.kind) {
    case 'Number':
      return node.value

    case 'Identifier': {
      const value = env.variables.get(node.name) ?? env.constants.get(node.name)
      if (value === undefined) {
        throw new EvaluationError(
          ErrorCode.UNKNOWN_IDENTIFIER,
          `Unknown identifier '${node.name}'.`,
          node.span.start,
          node.span.end,
        )
      }
      return value
    }

    case 'Unary': {
      const operand = evaluate(node.operand, env)
      return node.op === '-' ? ensureReal(-operand) : operand
    }

    case 'Postfix': {
      const operand = evaluate(node.operand, env)
      return guard(node.span, () =>
        node.op === '%' ? ensureReal(operand / 100) : ensureReal(factorial(operand)),
      )
    }

    case 'Binary':
      return evaluateBinary(node, env)

    case 'Call': {
      const definition = env.functions.get(node.callee)
      if (definition === undefined) {
        throw new EvaluationError(
          ErrorCode.UNKNOWN_FUNCTION,
          `Unknown function '${node.callee}'.`,
          node.calleeSpan.start,
          node.calleeSpan.end,
        )
      }
      const args = node.args.map((arg) => evaluate(arg, env))
      return guard(node.span, () =>
        ensureReal(definition.evaluate(args, { angleMode: env.angleMode })),
      )
    }
  }
}

function evaluateBinary(node: BinaryNode, env: Environment): number {
  const left = evaluate(node.left, env)

  // `200 + 10%` means "200 plus 10% of 200".
  if ((node.op === '+' || node.op === '-') && node.right.kind === 'Postfix' && node.right.op === '%') {
    const fraction = evaluate(node.right.operand, env) / 100
    const delta = guard(node.right.span, () => ensureReal(left * fraction))
    return guard(node.span, () => ensureReal(node.op === '+' ? left + delta : left - delta))
  }

  const right = evaluate(node.right, env)
  switch (node.op) {
    case '+':
      return guard(node.span, () => ensureReal(left + right))
    case '-':
      return guard(node.span, () => ensureReal(left - right))
    case '*':
      return guard(node.span, () => ensureReal(left * right))
    case '/':
      return guard(node.right.span, () => ensureReal(divide(left, right)))
    case '^':
      return guard(node.span, () => ensureReal(power(left, right)))
  }
}

/** Run a numeric operation, converting `MathError` into a positioned `EvaluationError`. */
function guard(span: Span, operation: () => number): number {
  try {
    return operation()
  } catch (error) {
    if (error instanceof MathError) {
      throw new EvaluationError(error.code, error.message, span.start, span.end)
    }
    throw error
  }
}

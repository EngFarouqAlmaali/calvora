import type { Expr } from '../ast'
import { ErrorCode, ValidationError } from '../errors'
import type { Environment } from '../evaluator/environment'

type ValidationScope = Pick<Environment, 'functions' | 'constants' | 'variables'>

function describeArity(min: number, max: number): string {
  const plural = (n: number): string => `${n} argument${n === 1 ? '' : 's'}`
  if (min === max) return plural(min)
  if (max === Number.POSITIVE_INFINITY) return `at least ${plural(min)}`
  return `${min} to ${plural(max)}`
}

/**
 * Check that a parsed tree only refers to things that exist, and that every
 * call has an acceptable number of arguments. Throws `ValidationError` at the
 * first problem, in source order. Pure: it does not evaluate anything.
 */
export function validate(node: Expr, scope: ValidationScope): void {
  switch (node.kind) {
    case 'Number':
      if (!Number.isFinite(node.value)) {
        throw new ValidationError(
          ErrorCode.UNEXPECTED_TOKEN,
          'Numbers must be finite.',
          node.span.start,
          node.span.end,
        )
      }
      return

    case 'Identifier': {
      const { name } = node
      if (scope.variables.has(name) || scope.constants.has(name)) return
      if (scope.functions.has(name)) {
        throw new ValidationError(
          ErrorCode.FUNCTION_NEEDS_PARENS,
          `'${name}' is a function; write it with parentheses, for example ${name}(…).`,
          node.span.start,
          node.span.end,
        )
      }
      throw new ValidationError(
        ErrorCode.UNKNOWN_IDENTIFIER,
        `Unknown identifier '${name}'.`,
        node.span.start,
        node.span.end,
      )
    }

    case 'Unary':
    case 'Postfix':
      validate(node.operand, scope)
      return

    case 'Binary':
      validate(node.left, scope)
      validate(node.right, scope)
      return

    case 'Call': {
      const definition = scope.functions.get(node.callee)
      if (definition === undefined) {
        if (scope.constants.has(node.callee) || scope.variables.has(node.callee)) {
          throw new ValidationError(
            ErrorCode.NOT_A_FUNCTION,
            `'${node.callee}' is a value, not a function. Use '*' to multiply by it.`,
            node.calleeSpan.start,
            node.calleeSpan.end,
          )
        }
        throw new ValidationError(
          ErrorCode.UNKNOWN_FUNCTION,
          `Unknown function '${node.callee}'.`,
          node.calleeSpan.start,
          node.calleeSpan.end,
        )
      }

      if (node.args.length < definition.minArgs || node.args.length > definition.maxArgs) {
        throw new ValidationError(
          ErrorCode.WRONG_ARGUMENT_COUNT,
          `${definition.name}() expects ${describeArity(definition.minArgs, definition.maxArgs)} but received ${node.args.length}.`,
          node.span.start,
          node.span.end,
        )
      }

      for (const arg of node.args) validate(arg, scope)
      return
    }
  }
}

import { createEngine, toSExpression } from '@/core'
import type { ErrorInfo } from '@/core'
import { scientificModule, standardModule } from '@/modules'

export const standard = standardModule.engine
export const scientific = scientificModule.engine

/** Evaluate in scientific mode and return the numeric value, failing loudly on errors. */
export function value(input: string, angleMode: 'deg' | 'rad' = 'deg'): number {
  const outcome = scientific.evaluate(input, { angleMode })
  if (!outcome.ok) throw new Error(`"${input}" failed: ${outcome.error.message}`)
  return outcome.value
}

/** Evaluate and return the error, failing loudly if evaluation succeeded. */
export function errorOf(
  input: string,
  engine = scientific,
  angleMode: 'deg' | 'rad' = 'deg',
): ErrorInfo {
  const outcome = engine.evaluate(input, { angleMode })
  if (outcome.ok) throw new Error(`"${input}" unexpectedly succeeded with ${outcome.formatted}`)
  return outcome.error
}

/** Parse in scientific mode and render the tree as an S-expression. */
export function tree(input: string): string {
  const outcome = scientific.evaluate(input)
  if (outcome.ok) return toSExpression(outcome.ast)
  throw new Error(`"${input}" failed: ${outcome.error.message}`)
}

export { createEngine }

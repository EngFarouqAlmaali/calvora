export type AngleMode = 'deg' | 'rad'

/** Per-evaluation settings handed to every function implementation. */
export interface FunctionContext {
  readonly angleMode: AngleMode
}

/**
 * A callable available to expressions. Implementations are pure: they receive
 * already-evaluated numeric arguments and either return a number or throw a
 * `MathError`.
 */
export interface FunctionDefinition {
  readonly name: string
  readonly minArgs: number
  /** Use `Infinity` for variadic functions. */
  readonly maxArgs: number
  readonly evaluate: (args: readonly number[], context: FunctionContext) => number
}

/**
 * Everything an expression can refer to. Lookups use `Map`, never plain
 * objects, so names like `constructor` or `__proto__` can never resolve to
 * anything inherited from `Object.prototype`.
 */
export interface Environment {
  readonly functions: ReadonlyMap<string, FunctionDefinition>
  readonly constants: ReadonlyMap<string, number>
  readonly variables: ReadonlyMap<string, number>
  readonly angleMode: AngleMode
}

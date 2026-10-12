/**
 * Abstract syntax tree for CALVORA expressions.
 *
 * Nodes are immutable, discriminated on `kind`, and carry the half-open
 * source range `[start, end)` they were parsed from so later phases can report
 * precise errors. Parentheses do not produce nodes: they only widen the span
 * of the expression they enclose.
 */

export interface Span {
  readonly start: number
  readonly end: number
}

export interface NumberNode {
  readonly kind: 'Number'
  readonly value: number
  readonly span: Span
}

export interface IdentifierNode {
  readonly kind: 'Identifier'
  /** Lower-cased name; identifiers are case-insensitive. */
  readonly name: string
  readonly span: Span
}

export type UnaryOperator = '+' | '-'

export interface UnaryNode {
  readonly kind: 'Unary'
  readonly op: UnaryOperator
  readonly operand: Expr
  readonly span: Span
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^'

export interface BinaryNode {
  readonly kind: 'Binary'
  readonly op: BinaryOperator
  readonly left: Expr
  readonly right: Expr
  /** True when a `*` was written as juxtaposition, e.g. `2(3+4)` or `2π`. */
  readonly implicit: boolean
  readonly span: Span
}

export type PostfixOperator = '%' | '!'

export interface PostfixNode {
  readonly kind: 'Postfix'
  readonly op: PostfixOperator
  readonly operand: Expr
  readonly span: Span
}

export interface CallNode {
  readonly kind: 'Call'
  /** Lower-cased function name. */
  readonly callee: string
  readonly args: readonly Expr[]
  readonly calleeSpan: Span
  readonly span: Span
}

export type Expr = NumberNode | IdentifierNode | UnaryNode | BinaryNode | PostfixNode | CallNode

/** Return the same node with a different span. */
export function withSpan<T extends Expr>(node: T, span: Span): T {
  return { ...node, span }
}

/**
 * Render a tree as a compact, fully parenthesised S-expression. Intended for
 * tests, debugging and documentation:
 *
 *   `1 + 2 * 3`  →  `(+ 1 (* 2 3))`
 *   `-x`         →  `(neg x)`
 *   `sin(30)`    →  `(call sin 30)`
 */
export function toSExpression(node: Expr): string {
  switch (node.kind) {
    case 'Number':
      return String(node.value)
    case 'Identifier':
      return node.name
    case 'Unary':
      return `(${node.op === '-' ? 'neg' : 'pos'} ${toSExpression(node.operand)})`
    case 'Binary':
      return `(${node.op} ${toSExpression(node.left)} ${toSExpression(node.right)})`
    case 'Postfix':
      return `(${node.op} ${toSExpression(node.operand)})`
    case 'Call':
      return `(call ${[node.callee, ...node.args.map(toSExpression)].join(' ')})`
  }
}

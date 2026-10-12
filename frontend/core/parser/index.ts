import { withSpan } from '../ast'
import type { BinaryOperator, CallNode, Expr, Span } from '../ast'
import { ErrorCode, ParseError, displayPosition } from '../errors'
import { TokenType, tokenize } from '../lexer'
import type { Token } from '../lexer'
import { MAX_NESTING_DEPTH } from '../limits'

/**
 * Recursive-descent parser. Grammar, from lowest to highest precedence:
 *
 *   expression     := additive EOF
 *   additive       := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative := unary (('*' | '/') unary | <implicit> unary)*
 *   unary          := ('+' | '-') unary | power
 *   power          := postfix ('^' unary)?          // right-associative
 *   postfix        := primary ('%' | '!')*
 *   primary        := NUMBER
 *                   | IDENTIFIER '(' [additive (',' additive)*] ')'
 *                   | IDENTIFIER
 *                   | '(' additive ')'
 *                   | '√' postfix
 *
 * `<implicit>` means juxtaposition: the next token is an identifier, `(` or
 * `√`, so `2π`, `2(3+4)` and `(1+2)(3+4)` multiply. Two adjacent numbers do
 * not.
 *
 * Because `unary` sits below `power`, `-2^2` is `-(2^2)`, while the exponent
 * itself may be signed, so `2^-2` is valid.
 */
class Parser {
  private position = 0
  private depth = 0

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): Expr {
    if (this.peek().type === TokenType.EOF) {
      throw new ParseError(ErrorCode.EMPTY_EXPRESSION, 'Enter an expression to calculate.', 0, 0)
    }

    const expression = this.parseAdditive()
    const trailing = this.peek()

    if (trailing.type !== TokenType.EOF) {
      if (trailing.type === TokenType.RParen) {
        throw new ParseError(
          ErrorCode.UNMATCHED_CLOSING_PAREN,
          `Unmatched ')' at position ${displayPosition(trailing.start)}.`,
          trailing.start,
          trailing.end,
        )
      }
      throw this.unexpected(trailing)
    }

    return expression
  }

  private peek(): Token {
    // The token list always ends with EOF, and `advance` never moves past it.
    return this.tokens[this.position] as Token
  }

  private advance(): Token {
    const token = this.peek()
    if (token.type !== TokenType.EOF) this.position += 1
    return token
  }

  private enter(token: Token): void {
    this.depth += 1
    if (this.depth > MAX_NESTING_DEPTH) {
      throw new ParseError(
        ErrorCode.NESTING_TOO_DEEP,
        `Expression is nested too deeply (limit is ${MAX_NESTING_DEPTH} levels).`,
        token.start,
        token.end,
      )
    }
  }

  private leave(): void {
    this.depth -= 1
  }

  private parseAdditive(): Expr {
    this.enter(this.peek())
    try {
      let left = this.parseMultiplicative()
      for (;;) {
        const token = this.peek()
        if (token.type !== TokenType.Plus && token.type !== TokenType.Minus) break
        this.advance()
        const right = this.parseMultiplicative()
        left = binary(token.type === TokenType.Plus ? '+' : '-', left, right, false)
      }
      return left
    } finally {
      this.leave()
    }
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary()
    for (;;) {
      const token = this.peek()
      if (token.type === TokenType.Star || token.type === TokenType.Slash) {
        this.advance()
        const right = this.parseUnary()
        left = binary(token.type === TokenType.Star ? '*' : '/', left, right, false)
      } else if (startsImplicitOperand(token)) {
        const right = this.parseUnary()
        left = binary('*', left, right, true)
      } else {
        return left
      }
    }
  }

  private parseUnary(): Expr {
    const token = this.peek()
    if (token.type === TokenType.Plus || token.type === TokenType.Minus) {
      this.enter(token)
      try {
        this.advance()
        const operand = this.parseUnary()
        return {
          kind: 'Unary',
          op: token.type === TokenType.Plus ? '+' : '-',
          operand,
          span: { start: token.start, end: operand.span.end },
        }
      } finally {
        this.leave()
      }
    }
    return this.parsePower()
  }

  private parsePower(): Expr {
    const base = this.parsePostfix()
    if (this.peek().type !== TokenType.Caret) return base
    this.advance()
    const exponent = this.parseUnary()
    return binary('^', base, exponent, false)
  }

  private parsePostfix(): Expr {
    let node = this.parsePrimary()
    for (;;) {
      const token = this.peek()
      if (token.type !== TokenType.Percent && token.type !== TokenType.Bang) return node
      this.advance()
      node = {
        kind: 'Postfix',
        op: token.type === TokenType.Percent ? '%' : '!',
        operand: node,
        span: { start: node.span.start, end: token.end },
      }
    }
  }

  private parsePrimary(): Expr {
    const token = this.peek()

    switch (token.type) {
      case TokenType.Number: {
        this.advance()
        return {
          kind: 'Number',
          value: token.value,
          span: { start: token.start, end: token.end },
        }
      }

      case TokenType.Identifier: {
        this.advance()
        if (this.peek().type === TokenType.LParen) return this.parseCall(token)
        return {
          kind: 'Identifier',
          name: token.lexeme.toLowerCase(),
          span: { start: token.start, end: token.end },
        }
      }

      case TokenType.LParen: {
        this.advance()
        const inner = this.parseAdditive()
        const close = this.expectClosing(token)
        return withSpan(inner, { start: token.start, end: close.end })
      }

      case TokenType.Radical: {
        this.advance()
        this.enter(token)
        try {
          const operand = this.parsePostfix()
          const call: CallNode = {
            kind: 'Call',
            callee: 'sqrt',
            args: [operand],
            calleeSpan: { start: token.start, end: token.end },
            span: { start: token.start, end: operand.span.end },
          }
          return call
        } finally {
          this.leave()
        }
      }

      case TokenType.EOF:
        throw new ParseError(
          ErrorCode.UNEXPECTED_END,
          `Expression ended unexpectedly at position ${displayPosition(token.start)}; a value was expected.`,
          token.start,
          token.end,
        )

      default:
        throw this.unexpected(token, "expected a number, function or '('")
    }
  }

  private parseCall(name: Token): CallNode {
    const open = this.advance() // the '(' the caller just peeked
    const args: Expr[] = []

    if (this.peek().type === TokenType.RParen) {
      const close = this.advance()
      return makeCall(name, args, close)
    }

    for (;;) {
      args.push(this.parseAdditive())
      if (this.peek().type !== TokenType.Comma) break
      this.advance()
    }

    const close = this.expectClosing(open)
    return makeCall(name, args, close)
  }

  private expectClosing(open: Token): Token {
    const token = this.peek()
    if (token.type === TokenType.RParen) return this.advance()
    if (token.type === TokenType.EOF) {
      throw new ParseError(
        ErrorCode.MISSING_CLOSING_PAREN,
        `Missing closing ')' for the '(' at position ${displayPosition(open.start)}.`,
        open.start,
        open.end,
      )
    }
    throw this.unexpected(token, "expected ')'")
  }

  private unexpected(token: Token, hint?: string): ParseError {
    const suffix = hint === undefined ? '.' : `: ${hint}.`
    return new ParseError(
      ErrorCode.UNEXPECTED_TOKEN,
      `Unexpected ${describe(token)} at position ${displayPosition(token.start)}${suffix}`,
      token.start,
      token.end,
    )
  }
}

function startsImplicitOperand(token: Token): boolean {
  return (
    token.type === TokenType.Identifier ||
    token.type === TokenType.LParen ||
    token.type === TokenType.Radical
  )
}

function describe(token: Token): string {
  switch (token.type) {
    case TokenType.Number:
      return `number '${token.lexeme}'`
    case TokenType.EOF:
      return 'end of expression'
    default:
      return `'${token.lexeme}'`
  }
}

function binary(op: BinaryOperator, left: Expr, right: Expr, implicit: boolean): Expr {
  const span: Span = { start: left.span.start, end: right.span.end }
  return { kind: 'Binary', op, left, right, implicit, span }
}

function makeCall(name: Token, args: readonly Expr[], close: Token): CallNode {
  return {
    kind: 'Call',
    callee: name.lexeme.toLowerCase(),
    args,
    calleeSpan: { start: name.start, end: name.end },
    span: { start: name.start, end: close.end },
  }
}

/** Parse a token list (as produced by `tokenize`) into an AST. */
export function parse(tokens: readonly Token[]): Expr {
  return new Parser(tokens).parse()
}

/** Convenience: tokenize and parse source text in one step. */
export function parseExpression(input: string): Expr {
  return parse(tokenize(input))
}

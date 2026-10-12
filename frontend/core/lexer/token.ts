export const TokenType = {
  Number: 'Number',
  Identifier: 'Identifier',
  Plus: 'Plus',
  Minus: 'Minus',
  Star: 'Star',
  Slash: 'Slash',
  Caret: 'Caret',
  Percent: 'Percent',
  Bang: 'Bang',
  LParen: 'LParen',
  RParen: 'RParen',
  Comma: 'Comma',
  Radical: 'Radical',
  EOF: 'EOF',
} as const

export type TokenType = (typeof TokenType)[keyof typeof TokenType]

interface TokenBase {
  /** The exact source text of the token. */
  readonly lexeme: string
  /** Inclusive 0-based start offset. */
  readonly start: number
  /** Exclusive 0-based end offset. */
  readonly end: number
}

export interface NumberToken extends TokenBase {
  readonly type: typeof TokenType.Number
  readonly value: number
}

export interface SimpleToken extends TokenBase {
  readonly type: Exclude<TokenType, typeof TokenType.Number>
}

export type Token = NumberToken | SimpleToken

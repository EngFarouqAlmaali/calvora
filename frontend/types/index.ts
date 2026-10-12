import type { AngleMode, Engine } from '@/core'

export type { AngleMode }

export type ModeId = 'standard' | 'scientific'

export type Theme = 'light' | 'dark'

export type KeyVariant = 'digit' | 'operator' | 'function' | 'action' | 'equals'

export type KeyAction =
  | { readonly type: 'insert'; readonly text: string }
  | { readonly type: 'clear' }
  | { readonly type: 'backspace' }
  | { readonly type: 'evaluate' }

export interface KeyDefinition {
  readonly id: string
  /** Text shown on the key. */
  readonly label: string
  /** Spoken label for assistive technology. */
  readonly ariaLabel: string
  readonly action: KeyAction
  readonly variant: KeyVariant
  /** Number of grid columns the key occupies. Defaults to 1. */
  readonly span?: number
}

/** A calculator mode: an engine plus the keypad that drives it. */
export interface CalculatorModule {
  readonly id: ModeId
  readonly label: string
  readonly description: string
  readonly engine: Engine
  readonly columns: number
  readonly keypad: readonly KeyDefinition[]
  /** Whether trigonometric functions depend on the degree/radian setting. */
  readonly usesAngleMode: boolean
}

export interface HistoryEntry {
  readonly id: string
  readonly expression: string
  /** Display string of the result. */
  readonly result: string
  readonly value: number
  readonly mode: ModeId
  readonly angleMode: AngleMode
  /** Milliseconds since the Unix epoch. */
  readonly timestamp: number
}

export interface Settings {
  readonly mode: ModeId
  readonly angleMode: AngleMode
  /** `null` follows the operating-system preference. */
  readonly theme: Theme | null
}

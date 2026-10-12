import { createEngine } from '@/core'
import type { CalculatorModule, KeyDefinition } from '@/types'
import {
  answerKey,
  backspaceKey,
  clearKey,
  closeParen,
  digit,
  divideBy,
  equalsKey,
  minus,
  openParen,
  percent,
  plus,
  times,
} from '../keys'

/** Four columns: arithmetic, percent, parentheses, decimals. */
const keypad: readonly KeyDefinition[] = [
  clearKey, backspaceKey, openParen, closeParen,
  digit('7'), digit('8'), digit('9'), divideBy,
  digit('4'), digit('5'), digit('6'), times,
  digit('1'), digit('2'), digit('3'), minus,
  digit('0'), digit('.'), percent, plus,
  answerKey, equalsKey(3),
]

export const standardModule: CalculatorModule = {
  id: 'standard',
  label: 'Standard',
  description: 'Arithmetic, percent, parentheses and decimals.',
  // No functions or constants: standard mode is arithmetic only.
  engine: createEngine(),
  columns: 4,
  keypad,
  usesAngleMode: false,
}

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
  func,
  minus,
  openParen,
  operator,
  percent,
  plus,
  times,
} from '../keys'
import { scientificConstants } from './constants'
import { scientificFunctions } from './functions'

export { scientificConstants } from './constants'
export { scientificFunctions } from './functions'

/** Five columns: function rows on top, the standard keypad below. */
const keypad: readonly KeyDefinition[] = [
  func('sin', 'sin', 'sin(', 'Sine'),
  func('cos', 'cos', 'cos(', 'Cosine'),
  func('tan', 'tan', 'tan(', 'Tangent'),
  openParen,
  closeParen,

  func('asin', 'sin⁻¹', 'asin(', 'Inverse sine'),
  func('acos', 'cos⁻¹', 'acos(', 'Inverse cosine'),
  func('atan', 'tan⁻¹', 'atan(', 'Inverse tangent'),
  func('pi', 'π', 'π', 'Pi'),
  func('euler', 'e', 'e', "Euler's number"),

  func('ln', 'ln', 'ln(', 'Natural logarithm'),
  func('log', 'log', 'log(', 'Base 10 logarithm'),
  func('sqrt', '√', '√(', 'Square root'),
  operator('power', 'xʸ', '^', 'To the power of'),
  operator('factorial', 'x!', '!', 'Factorial'),

  digit('7'), digit('8'), digit('9'), divideBy, clearKey,
  digit('4'), digit('5'), digit('6'), times, backspaceKey,
  digit('1'), digit('2'), digit('3'), minus, answerKey,
  digit('0'), digit('.'), percent, plus, equalsKey(),
]

export const scientificModule: CalculatorModule = {
  id: 'scientific',
  label: 'Scientific',
  description: 'Trigonometry, logarithms, roots, powers, factorials and constants.',
  engine: createEngine({ functions: scientificFunctions, constants: scientificConstants }),
  columns: 5,
  keypad,
  usesAngleMode: true,
}

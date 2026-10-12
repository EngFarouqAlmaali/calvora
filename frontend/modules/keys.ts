import type { KeyDefinition } from '@/types'

/** Small factories so each module's keypad reads like the keypad it describes. */

export function digit(value: string): KeyDefinition {
  return {
    id: `digit-${value}`,
    label: value,
    ariaLabel: value === '.' ? 'Decimal point' : value,
    action: { type: 'insert', text: value },
    variant: 'digit',
  }
}

export function operator(
  id: string,
  label: string,
  text: string,
  ariaLabel: string,
): KeyDefinition {
  return { id, label, ariaLabel, action: { type: 'insert', text }, variant: 'operator' }
}

export function func(id: string, label: string, text: string, ariaLabel: string): KeyDefinition {
  return { id, label, ariaLabel, action: { type: 'insert', text }, variant: 'function' }
}

export const clearKey: KeyDefinition = {
  id: 'clear',
  label: 'AC',
  ariaLabel: 'Clear expression',
  action: { type: 'clear' },
  variant: 'action',
}

export const backspaceKey: KeyDefinition = {
  id: 'backspace',
  label: '⌫',
  ariaLabel: 'Delete last character',
  action: { type: 'backspace' },
  variant: 'action',
}

export const answerKey: KeyDefinition = {
  id: 'ans',
  label: 'Ans',
  ariaLabel: 'Previous answer',
  action: { type: 'insert', text: 'ans' },
  variant: 'function',
}

export function equalsKey(span = 1): KeyDefinition {
  return {
    id: 'equals',
    label: '=',
    ariaLabel: 'Calculate',
    action: { type: 'evaluate' },
    variant: 'equals',
    span,
  }
}

export const openParen = operator('open-paren', '(', '(', 'Open parenthesis')
export const closeParen = operator('close-paren', ')', ')', 'Close parenthesis')
export const plus = operator('plus', '+', '+', 'Plus')
export const minus = operator('minus', '−', '−', 'Minus')
export const times = operator('times', '×', '×', 'Times')
export const divideBy = operator('divide', '÷', '÷', 'Divided by')
export const percent = operator('percent', '%', '%', 'Percent')

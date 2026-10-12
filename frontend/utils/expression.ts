/**
 * Pure text-editing helpers for the expression field. They take the current
 * text and selection and return the new text and caret, with no DOM access,
 * so keypad behaviour is testable on its own.
 */

export interface TextEdit {
  readonly text: string
  /** Caret offset after the edit. */
  readonly caret: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Replace the selection `[start, end)` with `insertion`. */
export function insertAt(text: string, start: number, end: number, insertion: string): TextEdit {
  const from = clamp(Math.min(start, end), 0, text.length)
  const to = clamp(Math.max(start, end), 0, text.length)
  return { text: text.slice(0, from) + insertion + text.slice(to), caret: from + insertion.length }
}

/**
 * Delete the selection, or the character before the caret when nothing is
 * selected. Deletes a whole code point so emoji are never split.
 */
export function backspaceAt(text: string, start: number, end: number): TextEdit {
  const from = clamp(Math.min(start, end), 0, text.length)
  const to = clamp(Math.max(start, end), 0, text.length)
  if (from !== to) return { text: text.slice(0, from) + text.slice(to), caret: from }
  if (from === 0) return { text, caret: 0 }
  const before = text.slice(0, from)
  const lastUnit = before.charCodeAt(before.length - 1)
  const previous = lastUnit >= 0xdc00 && lastUnit <= 0xdfff && before.length >= 2 ? 2 : 1
  return { text: before.slice(0, before.length - previous) + text.slice(to), caret: from - previous }
}

import { describe, expect, it } from 'vitest'
import {
  HISTORY_KEY,
  MAX_HISTORY_ENTRIES,
  SETTINGS_KEY,
  STORAGE_VERSION,
  loadHistory,
  loadSettings,
  parseHistoryEntry,
} from '@/services/persistence'
import { createMemoryStorage, readJson, writeJson } from '@/services/storage'
import type { KeyValueStorage } from '@/services/storage'
import { createCalculatorStore } from '@/stores/calculator'
import { createHistoryStore } from '@/stores/history'
import { createSettingsStore } from '@/stores/settings'
import { backspaceAt, insertAt } from '@/utils/expression'

function setup(storage: KeyValueStorage = createMemoryStorage()) {
  let clock = 1_000
  const history = createHistoryStore(storage, () => (clock += 1))
  const settings = createSettingsStore(storage)
  const calculator = createCalculatorStore({ history, settings })
  return { storage, history, settings, calculator }
}

const validEntry = {
  id: 'a',
  expression: '1+1',
  result: '2',
  value: 2,
  mode: 'standard',
  angleMode: 'deg',
  timestamp: 1,
}

describe('storage helpers', () => {
  it('round-trips JSON', () => {
    const storage = createMemoryStorage()
    expect(writeJson(storage, 'k', { a: 1 })).toBe(true)
    expect(readJson(storage, 'k')).toEqual({ a: 1 })
  })

  it('returns undefined for missing or corrupt values', () => {
    const storage = createMemoryStorage()
    expect(readJson(storage, 'missing')).toBeUndefined()
    storage.setItem('bad', '{not json')
    expect(readJson(storage, 'bad')).toBeUndefined()
  })

  it('reports failed writes instead of throwing', () => {
    const failing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
      removeItem: () => undefined,
    }
    expect(writeJson(failing, 'k', 1)).toBe(false)
  })
})

describe('persistence: validation', () => {
  it('accepts a well-formed entry', () => {
    expect(parseHistoryEntry(validEntry)).toEqual(validEntry)
  })

  it.each([
    ['not an object', 'x'],
    ['null', null],
    ['an array', []],
    ['missing id', { ...validEntry, id: undefined }],
    ['empty id', { ...validEntry, id: '' }],
    ['numeric expression', { ...validEntry, expression: 5 }],
    ['non-finite value', { ...validEntry, value: Number.POSITIVE_INFINITY }],
    ['unknown mode', { ...validEntry, mode: 'hacker' }],
    ['unknown angle mode', { ...validEntry, angleMode: 'grad' }],
    ['string timestamp', { ...validEntry, timestamp: '1' }],
  ])('rejects %s', (_label, input) => {
    expect(parseHistoryEntry(input)).toBeUndefined()
  })

  it('drops invalid and duplicate entries when loading', () => {
    const storage = createMemoryStorage()
    writeJson(storage, HISTORY_KEY, {
      version: STORAGE_VERSION,
      data: [validEntry, { nonsense: true }, validEntry, { ...validEntry, id: 'b' }],
    })
    expect(loadHistory(storage).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('discards data written by another storage version', () => {
    const storage = createMemoryStorage()
    writeJson(storage, HISTORY_KEY, { version: STORAGE_VERSION + 1, data: [validEntry] })
    expect(loadHistory(storage)).toEqual([])
  })

  it('caps the number of entries loaded', () => {
    const storage = createMemoryStorage()
    const many = Array.from({ length: MAX_HISTORY_ENTRIES + 50 }, (_, i) => ({ ...validEntry, id: `id${i}` }))
    writeJson(storage, HISTORY_KEY, { version: STORAGE_VERSION, data: many })
    expect(loadHistory(storage)).toHaveLength(MAX_HISTORY_ENTRIES)
  })

  it('falls back to defaults for invalid settings', () => {
    const storage = createMemoryStorage()
    writeJson(storage, SETTINGS_KEY, {
      version: STORAGE_VERSION,
      data: { mode: 'nope', angleMode: 7, theme: 'purple' },
    })
    expect(loadSettings(storage)).toEqual({ mode: 'standard', angleMode: 'deg', theme: null })
  })

  it('keeps valid settings and repairs only the bad fields', () => {
    const storage = createMemoryStorage()
    writeJson(storage, SETTINGS_KEY, {
      version: STORAGE_VERSION,
      data: { mode: 'scientific', angleMode: 'bogus', theme: 'dark' },
    })
    expect(loadSettings(storage)).toEqual({ mode: 'scientific', angleMode: 'deg', theme: 'dark' })
  })
})

describe('history store', () => {
  it('adds newest first with an id and timestamp', () => {
    const { history } = setup()
    history.add({ expression: '1+1', result: '2', value: 2, mode: 'standard', angleMode: 'deg' })
    history.add({ expression: '2+2', result: '4', value: 4, mode: 'standard', angleMode: 'deg' })
    expect(history.entries.value.map((e) => e.expression)).toEqual(['2+2', '1+1'])
    expect(history.entries.value[0]?.timestamp).toBeGreaterThan(history.entries.value[1]?.timestamp ?? 0)
    expect(history.entries.value[0]?.id).not.toBe(history.entries.value[1]?.id)
  })

  it('ignores an immediate repeat but not a later one', () => {
    const { history } = setup()
    const entry = { expression: '1+1', result: '2', value: 2, mode: 'standard', angleMode: 'deg' } as const
    expect(history.add(entry)).toBeDefined()
    expect(history.add(entry)).toBeUndefined()
    history.add({ ...entry, expression: '3' })
    expect(history.add(entry)).toBeDefined()
    expect(history.entries.value).toHaveLength(3)
  })

  it('treats the same text in another mode as a different calculation', () => {
    const { history } = setup()
    const entry = { expression: 'x', result: '1', value: 1, mode: 'standard', angleMode: 'deg' } as const
    history.add(entry)
    expect(history.add({ ...entry, angleMode: 'rad' })).toBeDefined()
  })

  it('caps stored entries', () => {
    const { history } = setup()
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 20; i += 1) {
      history.add({ expression: `${i}`, result: `${i}`, value: i, mode: 'standard', angleMode: 'deg' })
    }
    expect(history.entries.value).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(history.entries.value[0]?.expression).toBe(`${MAX_HISTORY_ENTRIES + 19}`)
  })

  it('searches expressions and results case-insensitively', () => {
    const { history } = setup()
    history.add({ expression: 'sin(30)', result: '0.5', value: 0.5, mode: 'scientific', angleMode: 'deg' })
    history.add({ expression: '2+2', result: '4', value: 4, mode: 'standard', angleMode: 'deg' })
    history.query.value = 'SIN'
    expect(history.filtered.value).toHaveLength(1)
    history.query.value = '4'
    expect(history.filtered.value.map((e) => e.expression)).toEqual(['2+2'])
    history.query.value = '  '
    expect(history.filtered.value).toHaveLength(2)
  })

  it('removes one entry and clears all', () => {
    const { history } = setup()
    history.add({ expression: 'a', result: '1', value: 1, mode: 'standard', angleMode: 'deg' })
    history.add({ expression: 'b', result: '2', value: 2, mode: 'standard', angleMode: 'deg' })
    const first = history.entries.value[1]
    history.remove(first?.id ?? '')
    expect(history.entries.value.map((e) => e.expression)).toEqual(['b'])
    history.clear()
    expect(history.entries.value).toEqual([])
  })

  it('persists across store instances', () => {
    const storage = createMemoryStorage()
    setup(storage).history.add({ expression: '1+1', result: '2', value: 2, mode: 'standard', angleMode: 'deg' })
    expect(createHistoryStore(storage).entries.value.map((e) => e.expression)).toEqual(['1+1'])
  })

  it('persists removals and clears', () => {
    const storage = createMemoryStorage()
    const { history } = setup(storage)
    history.add({ expression: '1', result: '1', value: 1, mode: 'standard', angleMode: 'deg' })
    history.clear()
    expect(createHistoryStore(storage).entries.value).toEqual([])
  })

  it('keeps working in memory when writes fail', () => {
    const failing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => undefined,
    }
    const { history } = setup(failing)
    expect(() =>
      history.add({ expression: '1', result: '1', value: 1, mode: 'standard', angleMode: 'deg' }),
    ).not.toThrow()
    expect(history.entries.value).toHaveLength(1)
  })
})

describe('settings store', () => {
  it('persists mode, angle mode and theme', () => {
    const storage = createMemoryStorage()
    const { settings } = setup(storage)
    settings.setMode('scientific')
    settings.setAngleMode('rad')
    settings.setTheme('dark')
    expect(createSettingsStore(storage).state.value).toEqual({
      mode: 'scientific',
      angleMode: 'rad',
      theme: 'dark',
    })
  })

  it('toggles the angle mode and resets to defaults', () => {
    const { settings } = setup()
    settings.toggleAngleMode()
    expect(settings.state.value.angleMode).toBe('rad')
    settings.toggleAngleMode()
    expect(settings.state.value.angleMode).toBe('deg')
    settings.setMode('scientific')
    settings.reset()
    expect(settings.state.value).toEqual({ mode: 'standard', angleMode: 'deg', theme: null })
  })
})

describe('calculator store', () => {
  it('evaluates and records history', () => {
    const { calculator, history } = setup()
    calculator.setExpression('(250*4)+150')
    const result = calculator.evaluate()
    expect(result).toMatchObject({ kind: 'value', formatted: '1150' })
    expect(history.entries.value[0]).toMatchObject({ expression: '(250*4)+150', result: '1150' })
  })

  it('returns a structured error and does not record it', () => {
    const { calculator, history } = setup()
    calculator.setExpression('1/0')
    const result = calculator.evaluate()
    expect(result).toMatchObject({ kind: 'error', error: { code: 'DIVISION_BY_ZERO' } })
    expect(history.entries.value).toEqual([])
  })

  it('uses the active module: functions are scientific-only', () => {
    const { calculator, settings } = setup()
    calculator.setExpression('sqrt(9)')
    expect(calculator.evaluate()).toMatchObject({ kind: 'error', error: { code: 'UNKNOWN_FUNCTION' } })
    settings.setMode('scientific')
    expect(calculator.evaluate()).toMatchObject({ kind: 'value', formatted: '3' })
  })

  it('respects the angle mode', () => {
    const { calculator, settings } = setup()
    settings.setMode('scientific')
    calculator.setExpression('sin(90)')
    expect(calculator.evaluate()).toMatchObject({ formatted: '1' })
    settings.setAngleMode('rad')
    expect(calculator.evaluate()).toMatchObject({ formatted: '0.893996663601' })
  })

  it('provides the previous answer as ans', () => {
    const { calculator } = setup()
    calculator.setExpression('6*7')
    calculator.evaluate()
    calculator.setExpression('ans+8')
    expect(calculator.evaluate()).toMatchObject({ kind: 'value', formatted: '50' })
  })

  it('explains ans when there is no previous answer', () => {
    const { calculator } = setup()
    calculator.setExpression('ans+1')
    const result = calculator.evaluate()
    expect(result).toMatchObject({ kind: 'error' })
    expect(result.kind === 'error' && result.error.message).toBe(
      'There is no previous answer yet. Calculate something first.',
    )
  })

  it('shows a live preview only for valid expressions', () => {
    const { calculator } = setup()
    expect(calculator.preview.value).toBeNull()
    calculator.setExpression('2+')
    expect(calculator.preview.value).toBeNull()
    calculator.setExpression('2+3')
    expect(calculator.preview.value).toBe('5')
  })

  it('clears the outcome when the text changes', () => {
    const { calculator } = setup()
    calculator.setExpression('1+1')
    calculator.evaluate()
    expect(calculator.result.value).not.toBeNull()
    calculator.setExpression('1+12')
    expect(calculator.result.value).toBeNull()
  })

  it('applies keypad actions and returns the caret', () => {
    const { calculator } = setup()
    expect(calculator.press({ type: 'insert', text: '12' }, 0, 0)).toBe(2)
    expect(calculator.press({ type: 'insert', text: '+' }, 2, 2)).toBe(3)
    expect(calculator.press({ type: 'insert', text: '3' }, 3, 3)).toBe(4)
    expect(calculator.expression.value).toBe('12+3')
    expect(calculator.press({ type: 'backspace' }, 4, 4)).toBe(3)
    expect(calculator.expression.value).toBe('12+')
    calculator.press({ type: 'insert', text: '9' }, 3, 3)
    calculator.press({ type: 'evaluate' }, 4, 4)
    expect(calculator.result.value).toMatchObject({ kind: 'value', formatted: '21' })
    expect(calculator.press({ type: 'clear' }, 4, 4)).toBe(0)
    expect(calculator.expression.value).toBe('')
  })

  it('steps through earlier expressions and restores the draft', () => {
    const { calculator } = setup()
    for (const text of ['1+1', '2+2', '3+3']) {
      calculator.setExpression(text)
      calculator.evaluate()
    }
    calculator.setExpression('9*9')
    expect(calculator.stepHistory('older')).toBe(true)
    expect(calculator.expression.value).toBe('3+3')
    calculator.stepHistory('older')
    expect(calculator.expression.value).toBe('2+2')
    calculator.stepHistory('older')
    calculator.stepHistory('older')
    expect(calculator.expression.value).toBe('1+1')
    expect(calculator.stepHistory('older')).toBe(false)
    calculator.stepHistory('newer')
    expect(calculator.expression.value).toBe('2+2')
    calculator.stepHistory('newer')
    calculator.stepHistory('newer')
    expect(calculator.expression.value).toBe('9*9')
    expect(calculator.stepHistory('newer')).toBe(false)
  })

  it('does nothing when stepping with empty history', () => {
    const { calculator } = setup()
    expect(calculator.stepHistory('older')).toBe(false)
  })

  it('recalls a history expression', () => {
    const { calculator } = setup()
    calculator.recall('sin(30)')
    expect(calculator.expression.value).toBe('sin(30)')
  })
})

describe('expression editing helpers', () => {
  it('inserts at the caret and replaces a selection', () => {
    expect(insertAt('1+3', 2, 2, '2')).toEqual({ text: '1+23', caret: 3 })
    expect(insertAt('1+23', 2, 4, '9')).toEqual({ text: '1+9', caret: 3 })
    expect(insertAt('abc', 3, 1, 'X')).toEqual({ text: 'aX', caret: 2 })
  })

  it('clamps out-of-range selections', () => {
    expect(insertAt('ab', 99, 99, 'c')).toEqual({ text: 'abc', caret: 3 })
    expect(insertAt('ab', -5, -5, 'c')).toEqual({ text: 'cab', caret: 1 })
  })

  it('deletes the previous character or the selection', () => {
    expect(backspaceAt('123', 3, 3)).toEqual({ text: '12', caret: 2 })
    expect(backspaceAt('123', 1, 3)).toEqual({ text: '1', caret: 1 })
    expect(backspaceAt('123', 0, 0)).toEqual({ text: '123', caret: 0 })
  })

  it('deletes a whole surrogate pair', () => {
    expect(backspaceAt('1😀', 3, 3)).toEqual({ text: '1', caret: 1 })
  })
})

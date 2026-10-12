import { computed, ref } from 'vue'
import { ErrorCode } from '@/core'
import type { ErrorInfo, EvaluationOutcome } from '@/core'
import { getModule } from '@/modules'
import type { KeyAction } from '@/types'
import { backspaceAt, insertAt } from '@/utils/expression'
import type { HistoryStore } from './history'
import type { SettingsStore } from './settings'

export type CalculationResult =
  | { readonly kind: 'value'; readonly formatted: string; readonly value: number }
  | { readonly kind: 'error'; readonly error: ErrorInfo; readonly expression: string }

interface Dependencies {
  readonly history: HistoryStore
  readonly settings: SettingsStore
}

/** Rewrite the engine's generic message when `ans` is used before any answer exists. */
function describeError(error: ErrorInfo, expression: string): ErrorInfo {
  if (
    error.code === ErrorCode.UNKNOWN_IDENTIFIER &&
    expression.slice(error.start, error.end).toLowerCase() === 'ans'
  ) {
    return { ...error, message: 'There is no previous answer yet. Calculate something first.' }
  }
  return error
}

/**
 * The calculator session: the expression being edited, its outcome, and
 * navigation through earlier expressions. All computation is delegated to the
 * engine of the active module; this store only coordinates state.
 */
export function createCalculatorStore({ history, settings }: Dependencies) {
  const expression = ref('')
  const result = ref<CalculationResult | null>(null)

  /** Position while stepping through history with the arrow keys; -1 is the draft. */
  const recallIndex = ref(-1)
  let draft = ''

  const activeModule = computed(() => getModule(settings.state.value.mode))
  const lastAnswer = computed(() => history.entries.value[0]?.value ?? null)

  function run(input: string): EvaluationOutcome {
    const answer = lastAnswer.value
    return activeModule.value.engine.evaluate(input, {
      angleMode: settings.state.value.angleMode,
      ...(answer === null ? {} : { variables: { ans: answer } }),
    })
  }

  /** Live result of the current text, shown only while it is a valid expression. */
  const preview = computed<string | null>(() => {
    if (expression.value.trim() === '') return null
    const outcome = run(expression.value)
    return outcome.ok ? outcome.formatted : null
  })

  function setExpression(text: string): void {
    expression.value = text
    result.value = null
    recallIndex.value = -1
  }

  function evaluate(): CalculationResult {
    const input = expression.value
    const outcome = run(input)
    recallIndex.value = -1

    if (outcome.ok) {
      result.value = { kind: 'value', formatted: outcome.formatted, value: outcome.value }
      history.add({
        expression: input.trim(),
        result: outcome.formatted,
        value: outcome.value,
        mode: settings.state.value.mode,
        angleMode: settings.state.value.angleMode,
      })
    } else {
      result.value = { kind: 'error', error: describeError(outcome.error, input), expression: input }
    }
    return result.value
  }

  /** Apply a keypad action at the given selection and return the new caret offset. */
  function press(action: KeyAction, selectionStart: number, selectionEnd: number): number {
    switch (action.type) {
      case 'insert': {
        const edit = insertAt(expression.value, selectionStart, selectionEnd, action.text)
        setExpression(edit.text)
        return edit.caret
      }
      case 'backspace': {
        const edit = backspaceAt(expression.value, selectionStart, selectionEnd)
        setExpression(edit.text)
        return edit.caret
      }
      case 'clear':
        setExpression('')
        return 0
      case 'evaluate':
        evaluate()
        return selectionEnd
    }
  }

  /** Step through earlier expressions. Returns `true` if the text changed. */
  function stepHistory(direction: 'older' | 'newer'): boolean {
    const entries = history.entries.value
    const current = recallIndex.value
    const next =
      direction === 'older' ? Math.min(current + 1, entries.length - 1) : Math.max(current - 1, -1)
    if (next === current || entries.length === 0) return false

    if (current === -1) draft = expression.value
    recallIndex.value = next
    expression.value = next === -1 ? draft : (entries[next]?.expression ?? draft)
    result.value = null
    return true
  }

  /** Put an expression back in the input, e.g. from a history entry. */
  function recall(text: string): void {
    setExpression(text)
  }

  return {
    expression,
    result,
    preview,
    activeModule,
    lastAnswer,
    setExpression,
    evaluate,
    press,
    stepHistory,
    recall,
  }
}

export type CalculatorStore = ReturnType<typeof createCalculatorStore>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalculationResult } from '@/stores/calculator'

const props = defineProps<{
  modelValue: string
  result: CalculationResult | null
  preview: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [text: string]
  evaluate: []
  clear: []
  step: [direction: 'older' | 'newer']
}>()

const input = ref<HTMLInputElement | null>(null)

/** The expression split around the part the engine rejected. */
const diagnostic = computed(() => {
  const result = props.result
  if (result === null || result.kind !== 'error') return null
  const { expression, error } = result
  const start = Math.min(Math.max(error.start, 0), expression.length)
  const end = Math.min(Math.max(error.end, start), expression.length)
  return {
    before: expression.slice(0, start),
    bad: expression.slice(start, end),
    after: expression.slice(end),
    message: error.message,
  }
})

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('evaluate')
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('clear')
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    emit('step', event.key === 'ArrowUp' ? 'older' : 'newer')
  }
}

function focus(): void {
  input.value?.focus()
}

function selection(): { start: number; end: number } {
  const element = input.value
  const length = props.modelValue.length
  return {
    start: element?.selectionStart ?? length,
    end: element?.selectionEnd ?? length,
  }
}

function setCaret(offset: number): void {
  const element = input.value
  if (element === null) return
  element.focus()
  element.setSelectionRange(offset, offset)
}

defineExpose({ focus, selection, setCaret })
</script>

<template>
  <section class="display" aria-label="Expression and result">
    <label class="sr-only" for="expression">Expression</label>
    <input
      id="expression"
      ref="input"
      class="field"
      type="text"
      :value="modelValue"
      placeholder="Type an expression, such as 2(3+4)^2"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      enterkeyhint="go"
      aria-describedby="outcome"
      :aria-invalid="diagnostic !== null"
      @input="onInput"
      @keydown="onKeydown"
    />

    <div id="outcome" class="outcome" aria-live="polite">
      <div v-if="diagnostic" class="diagnostic" role="alert">
        <pre class="source" aria-hidden="true"><span>{{ diagnostic.before }}</span><mark
          :class="{ point: diagnostic.bad === '' }"
        >{{ diagnostic.bad === '' ? ' ' : diagnostic.bad }}</mark><span>{{ diagnostic.after }}</span></pre>
        <p class="message">{{ diagnostic.message }}</p>
      </div>
      <p v-else-if="result?.kind === 'value'" class="answer">
        <span class="equals" aria-hidden="true">=</span>
        <span class="sr-only">Result </span>{{ result.formatted }}
      </p>
      <p v-else-if="preview !== null" class="answer preview">
        <span class="equals" aria-hidden="true">=</span>
        <span class="sr-only">Preview </span>{{ preview }}
      </p>
      <p v-else class="hint">Press Enter to calculate.</p>
    </div>
  </section>
</template>

<style scoped>
.display {
  display: grid;
  gap: 0.5rem;
  padding: 1rem var(--gutter) 0.75rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.field {
  width: 100%;
  min-width: 0;
  padding: 0.35rem 0;
  border: 0;
  border-bottom: 2px solid var(--line);
  border-radius: 0;
  background: transparent;
  font-family: var(--font-math);
  font-size: clamp(1.25rem, 4.5vw, 1.75rem);
  letter-spacing: 0.01em;
}

.field::placeholder {
  color: var(--ink-2);
  opacity: 0.7;
  font-size: 1rem;
}

.field:focus {
  outline: none;
  border-bottom-color: var(--accent);
}

.field:focus-visible {
  outline: none;
  box-shadow: 0 2px 0 0 var(--accent);
}

.field[aria-invalid='true'] {
  border-bottom-color: var(--error);
}

.outcome {
  min-height: 4.25rem;
}

.answer {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-family: var(--font-math);
  font-size: clamp(1.75rem, 7vw, 2.5rem);
  line-height: 1.2;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.answer.preview {
  color: var(--ink-2);
  font-weight: 500;
}

.equals {
  color: var(--accent);
}

.hint {
  margin: 0;
  padding-top: 0.6rem;
  color: var(--ink-2);
  font-size: 0.9rem;
}

.diagnostic {
  padding: 0.5rem 0.75rem;
  background: var(--error-bg);
  border-left: 3px solid var(--error);
  border-radius: 0 var(--radius-key) var(--radius-key) 0;
}

.source {
  margin: 0;
  font-family: var(--font-math);
  font-size: 1.05rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.source mark {
  background: transparent;
  color: var(--error);
  font-weight: 700;
  text-decoration: underline wavy var(--error);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.source mark.point {
  text-decoration: none;
  border-bottom: 2px solid var(--error);
}

.message {
  margin: 0.25rem 0 0;
  color: var(--error);
  font-size: 0.95rem;
  max-width: 60ch;
}
</style>

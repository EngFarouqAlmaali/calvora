<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import ExpressionDisplay from '@/components/ExpressionDisplay.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import Keypad from '@/components/Keypad.vue'
import { useShortcuts } from '@/composables/useShortcuts'
import { useTheme } from '@/composables/useTheme'
import { useWorkspace } from '@/composables/useWorkspace'
import { modules } from '@/modules'
import type { HistoryEntry, KeyAction, ModeId } from '@/types'

const { history, settings, calculator } = useWorkspace()
const { effectiveTheme, toggleTheme } = useTheme(settings)

const display = ref<InstanceType<typeof ExpressionDisplay> | null>(null)
const status = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined

const activeModule = calculator.activeModule

/** Announce a short confirmation to screen readers and clear it shortly after. */
function announce(message: string): void {
  status.value = message
  clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    status.value = ''
  }, 2500)
}

function focusAt(offset: number): void {
  void nextTick(() => display.value?.setCaret(offset))
}

function onPress(action: KeyAction): void {
  const { start, end } = display.value?.selection() ?? {
    start: calculator.expression.value.length,
    end: calculator.expression.value.length,
  }
  focusAt(calculator.press(action, start, end))
}

function onStep(direction: 'older' | 'newer'): void {
  if (calculator.stepHistory(direction)) focusAt(calculator.expression.value.length)
}

function selectMode(mode: ModeId): void {
  settings.setMode(mode)
  calculator.setExpression(calculator.expression.value)
}

function onRecall(entry: HistoryEntry): void {
  if (entry.mode !== settings.state.value.mode) settings.setMode(entry.mode)
  if (entry.angleMode !== settings.state.value.angleMode) settings.setAngleMode(entry.angleMode)
  calculator.recall(entry.expression)
  focusAt(entry.expression.length)
}

async function onCopy(entry: HistoryEntry): Promise<void> {
  try {
    await navigator.clipboard.writeText(entry.result)
    announce(`Copied ${entry.result}`)
  } catch {
    announce('Copy is not available in this browser.')
  }
}

function onRemove(entry: HistoryEntry): void {
  history.remove(entry.id)
  announce('Deleted from history')
}

function onClearHistory(): void {
  history.clear()
  announce('History cleared')
}

useShortcuts({
  focusExpression: () => display.value?.focus(),
  selectMode: (index) => {
    const module = modules[index]
    if (module !== undefined) selectMode(module.id)
  },
  toggleAngleMode: () => {
    if (activeModule.value.usesAngleMode) settings.toggleAngleMode()
  },
})

const shortcuts: readonly { keys: string; action: string }[] = [
  { keys: '/', action: 'Focus the expression field' },
  { keys: 'Enter', action: 'Calculate' },
  { keys: 'Esc', action: 'Clear the expression' },
  { keys: 'Up and Down', action: 'Step through earlier expressions' },
  { keys: 'Alt+1, Alt+2', action: 'Standard or scientific mode' },
  { keys: 'Alt+D', action: 'Switch between degrees and radians' },
]

const year = computed(() => new Date().getFullYear())

onUnmounted(() => clearTimeout(statusTimer))
</script>

<template>
  <div class="app">
    <a class="skip" href="#expression">Skip to the expression field</a>

    <AppHeader
      :modules="modules"
      :mode="settings.state.value.mode"
      :angle-mode="settings.state.value.angleMode"
      :show-angle-mode="activeModule.usesAngleMode"
      :theme="effectiveTheme"
      @select-mode="selectMode"
      @toggle-angle="settings.toggleAngleMode"
      @toggle-theme="toggleTheme"
    />

    <main class="workspace">
      <section class="calculator" aria-label="Calculator">
        <ExpressionDisplay
          ref="display"
          :model-value="calculator.expression.value"
          :result="calculator.result.value"
          :preview="calculator.preview.value"
          @update:model-value="calculator.setExpression"
          @evaluate="calculator.evaluate"
          @clear="calculator.setExpression('')"
          @step="onStep"
        />

        <Keypad :keys="activeModule.keypad" :columns="activeModule.columns" @press="onPress" />

        <details class="shortcuts">
          <summary>Keyboard shortcuts</summary>
          <dl class="shortcut-list">
            <template v-for="shortcut in shortcuts" :key="shortcut.keys">
              <dt>
                <kbd>{{ shortcut.keys }}</kbd>
              </dt>
              <dd>{{ shortcut.action }}</dd>
            </template>
          </dl>
        </details>
      </section>

      <HistoryPanel
        :entries="history.filtered.value"
        :total="history.entries.value.length"
        :query="history.query.value"
        @update:query="history.query.value = $event"
        @recall="onRecall"
        @copy="onCopy"
        @remove="onRemove"
        @clear="onClearHistory"
      />
    </main>

    <footer class="footer">
      <p>
        © {{ year }} Engineer Farouq AlMaali. All rights reserved.
        <a href="https://engineerfarouqalmaali.vercel.app/" rel="noopener noreferrer">Portfolio</a>
      </p>
      <p>Calculations run in your browser. Nothing is sent anywhere.</p>
    </footer>

    <p class="sr-only" role="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.app {
  display: grid;
  gap: 1.25rem;
  width: 100%;
  max-width: 68rem;
  margin: 0 auto;
  padding: 1rem var(--gutter) 2rem;
}

.skip {
  position: absolute;
  left: var(--gutter);
  top: -4rem;
  padding: 0.5rem 0.9rem;
  background: var(--accent);
  color: var(--on-accent);
  border-radius: var(--radius-key);
  font-weight: 600;
  z-index: 10;
}

.skip:focus {
  top: 0.5rem;
}

.workspace {
  display: grid;
  gap: 1.25rem;
  align-items: start;
}

.calculator {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.shortcuts {
  padding: 0.6rem 0.9rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink-2);
}

.shortcuts summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--ink);
}

.shortcut-list {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1rem;
  margin: 0.75rem 0 0.25rem;
}

.shortcut-list dt,
.shortcut-list dd {
  margin: 0;
}

kbd {
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface-2);
  color: var(--ink);
  font-family: var(--font-math);
  font-size: 0.85rem;
}

.footer {
  display: grid;
  gap: 0.25rem;
  color: var(--ink-2);
  font-size: 0.875rem;
}

.footer p {
  margin: 0;
}

.footer a {
  margin-left: 0.5rem;
  color: var(--accent);
  font-weight: 600;
}

@media (min-width: 56rem) {
  .workspace {
    grid-template-columns: minmax(0, 34rem) minmax(18rem, 1fr);
  }
}
</style>

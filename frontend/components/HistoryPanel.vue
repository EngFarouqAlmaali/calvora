<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { HistoryEntry } from '@/types'
import { formatTimestamp } from '@/utils/time'

defineProps<{
  entries: readonly HistoryEntry[]
  total: number
  query: string
}>()

const emit = defineEmits<{
  'update:query': [query: string]
  recall: [entry: HistoryEntry]
  copy: [entry: HistoryEntry]
  remove: [entry: HistoryEntry]
  clear: []
}>()

/** Clearing everything takes two deliberate clicks; the prompt expires on its own. */
const confirmingClear = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

function askToClear(): void {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    confirmTimer = setTimeout(() => {
      confirmingClear.value = false
    }, 4000)
    return
  }
  clearTimeout(confirmTimer)
  confirmingClear.value = false
  emit('clear')
}

onUnmounted(() => clearTimeout(confirmTimer))
</script>

<template>
  <section class="history" aria-labelledby="history-title">
    <header class="top">
      <h2 id="history-title" class="title">History</h2>
      <button
        type="button"
        class="text-button"
        :class="{ danger: confirmingClear }"
        :disabled="total === 0"
        @click="askToClear"
      >
        {{ confirmingClear ? 'Confirm clear all' : 'Clear all' }}
      </button>
    </header>

    <label class="sr-only" for="history-search">Search history</label>
    <input
      id="history-search"
      class="search"
      type="search"
      placeholder="Search history"
      autocomplete="off"
      :value="query"
      :disabled="total === 0"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    />

    <p v-if="total === 0" class="empty">
      Calculations you run appear here. They are saved on this device only.
    </p>
    <p v-else-if="entries.length === 0" class="empty">No calculation matches “{{ query }}”.</p>

    <ul v-else class="list">
      <li v-for="entry in entries" :key="entry.id" class="item">
        <button
          type="button"
          class="recall"
          :aria-label="`Reuse ${entry.expression}, which equals ${entry.result}`"
          @click="emit('recall', entry)"
        >
          <span class="expression">{{ entry.expression }}</span>
          <span class="result">= {{ entry.result }}</span>
        </button>
        <div class="meta">
          <time class="time" :datetime="new Date(entry.timestamp).toISOString()">
            {{ formatTimestamp(entry.timestamp) }}
          </time>
          <button type="button" class="text-button" @click="emit('copy', entry)">
            Copy<span class="sr-only"> result of {{ entry.expression }}</span>
          </button>
          <button type="button" class="text-button" @click="emit('remove', entry)">
            Delete<span class="sr-only"> {{ entry.expression }}</span>
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  padding: var(--gutter);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
}

.search {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-key);
  background: var(--surface-2);
}

.search:disabled {
  opacity: 0.6;
}

.empty {
  margin: 0.25rem 0;
  max-width: 40ch;
  color: var(--ink-2);
}

.list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  max-height: 26rem;
}

.item {
  padding: 0.5rem 0.65rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-key);
}

.recall {
  display: grid;
  width: 100%;
  padding: 0.15rem 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: var(--font-math);
}

.expression {
  color: var(--ink-2);
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.result {
  font-size: 1.15rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.25rem 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.time {
  margin-right: auto;
  color: var(--ink-2);
  font-size: 0.8rem;
}

.text-button {
  padding: 0.25rem 0.4rem;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
}

.text-button:disabled {
  color: var(--ink-2);
  opacity: 0.6;
  cursor: not-allowed;
}

.text-button.danger {
  color: var(--error);
}

@media (hover: hover) {
  .text-button:not(:disabled):hover {
    text-decoration: underline;
  }
}
</style>

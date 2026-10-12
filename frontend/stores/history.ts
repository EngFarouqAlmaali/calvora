import { computed, ref } from 'vue'
import { MAX_HISTORY_ENTRIES, loadHistory, saveHistory } from '@/services/persistence'
import type { KeyValueStorage } from '@/services/storage'
import type { HistoryEntry } from '@/types'
import { createId } from '@/utils/id'

export type NewHistoryEntry = Omit<HistoryEntry, 'id' | 'timestamp'>

/** Calculation history, newest first, persisted on every change. */
export function createHistoryStore(storage: KeyValueStorage, now: () => number = Date.now) {
  const entries = ref<HistoryEntry[]>(loadHistory(storage))
  const query = ref('')

  const filtered = computed(() => {
    const needle = query.value.trim().toLowerCase()
    if (needle === '') return entries.value
    return entries.value.filter(
      (entry) =>
        entry.expression.toLowerCase().includes(needle) || entry.result.toLowerCase().includes(needle),
    )
  })

  function persist(): void {
    saveHistory(storage, entries.value)
  }

  /** Add a calculation. An immediate repeat of the latest entry is ignored. */
  function add(input: NewHistoryEntry): HistoryEntry | undefined {
    const latest = entries.value[0]
    if (
      latest !== undefined &&
      latest.expression === input.expression &&
      latest.result === input.result &&
      latest.mode === input.mode &&
      latest.angleMode === input.angleMode
    ) {
      return undefined
    }
    const timestamp = now()
    const entry: HistoryEntry = { ...input, id: createId(timestamp), timestamp }
    entries.value = [entry, ...entries.value].slice(0, MAX_HISTORY_ENTRIES)
    persist()
    return entry
  }

  function remove(id: string): void {
    entries.value = entries.value.filter((entry) => entry.id !== id)
    persist()
  }

  function clear(): void {
    entries.value = []
    persist()
  }

  return { entries, query, filtered, add, remove, clear }
}

export type HistoryStore = ReturnType<typeof createHistoryStore>

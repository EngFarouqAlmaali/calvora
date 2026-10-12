import type { AngleMode, HistoryEntry, ModeId, Settings, Theme } from '@/types'
import { readJson, writeJson } from './storage'
import type { KeyValueStorage } from './storage'

/** Bump when the stored shape changes; older data is then discarded safely. */
export const STORAGE_VERSION = 1
export const HISTORY_KEY = 'calvora:history'
export const SETTINGS_KEY = 'calvora:settings'
export const MAX_HISTORY_ENTRIES = 200

export const DEFAULT_SETTINGS: Settings = {
  mode: 'standard',
  angleMode: 'deg',
  theme: null,
}

interface Envelope {
  readonly version: number
  readonly data: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrap(raw: unknown): unknown {
  if (!isRecord(raw) || raw['version'] !== STORAGE_VERSION) return undefined
  return raw['data']
}

function isMode(value: unknown): value is ModeId {
  return value === 'standard' || value === 'scientific'
}

function isAngleMode(value: unknown): value is AngleMode {
  return value === 'deg' || value === 'rad'
}

/** Validate one stored entry field by field; anything malformed is dropped. */
export function parseHistoryEntry(value: unknown): HistoryEntry | undefined {
  if (!isRecord(value)) return undefined
  const { id, expression, result, value: numeric, mode, angleMode, timestamp } = value
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof expression !== 'string' ||
    typeof result !== 'string' ||
    typeof numeric !== 'number' ||
    !Number.isFinite(numeric) ||
    !isMode(mode) ||
    !isAngleMode(angleMode) ||
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp)
  ) {
    return undefined
  }
  return { id, expression, result, value: numeric, mode, angleMode, timestamp }
}

export function loadHistory(storage: KeyValueStorage): HistoryEntry[] {
  const data = unwrap(readJson(storage, HISTORY_KEY))
  if (!Array.isArray(data)) return []
  const entries: HistoryEntry[] = []
  const seen = new Set<string>()
  for (const item of data) {
    const entry = parseHistoryEntry(item)
    if (entry !== undefined && !seen.has(entry.id)) {
      seen.add(entry.id)
      entries.push(entry)
    }
    if (entries.length >= MAX_HISTORY_ENTRIES) break
  }
  return entries
}

export function saveHistory(storage: KeyValueStorage, entries: readonly HistoryEntry[]): boolean {
  const envelope: Envelope = {
    version: STORAGE_VERSION,
    data: entries.slice(0, MAX_HISTORY_ENTRIES),
  }
  return writeJson(storage, HISTORY_KEY, envelope)
}

export function loadSettings(storage: KeyValueStorage): Settings {
  const data = unwrap(readJson(storage, SETTINGS_KEY))
  if (!isRecord(data)) return DEFAULT_SETTINGS
  const theme: Theme | null = data['theme'] === 'light' || data['theme'] === 'dark' ? data['theme'] : null
  return {
    mode: isMode(data['mode']) ? data['mode'] : DEFAULT_SETTINGS.mode,
    angleMode: isAngleMode(data['angleMode']) ? data['angleMode'] : DEFAULT_SETTINGS.angleMode,
    theme,
  }
}

export function saveSettings(storage: KeyValueStorage, settings: Settings): boolean {
  const envelope: Envelope = { version: STORAGE_VERSION, data: settings }
  return writeJson(storage, SETTINGS_KEY, envelope)
}

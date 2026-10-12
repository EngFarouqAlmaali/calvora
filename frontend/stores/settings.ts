import { ref } from 'vue'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/services/persistence'
import type { KeyValueStorage } from '@/services/storage'
import type { AngleMode, ModeId, Settings, Theme } from '@/types'

/** User preferences, persisted on every change. */
export function createSettingsStore(storage: KeyValueStorage) {
  const state = ref<Settings>(loadSettings(storage))

  function update(patch: Partial<Settings>): void {
    state.value = { ...state.value, ...patch }
    saveSettings(storage, state.value)
  }

  return {
    state,
    setMode: (mode: ModeId): void => update({ mode }),
    setAngleMode: (angleMode: AngleMode): void => update({ angleMode }),
    toggleAngleMode: (): void => update({ angleMode: state.value.angleMode === 'deg' ? 'rad' : 'deg' }),
    setTheme: (theme: Theme | null): void => update({ theme }),
    reset: (): void => update({ ...DEFAULT_SETTINGS }),
  }
}

export type SettingsStore = ReturnType<typeof createSettingsStore>

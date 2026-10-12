import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import type { SettingsStore } from '@/stores/settings'
import type { Theme } from '@/types'

/**
 * Apply the chosen theme to the document. With no explicit choice the
 * operating-system preference decides, through CSS `prefers-color-scheme`.
 */
export function useTheme(settings: SettingsStore) {
  const systemPrefersDark = ref(false)
  let query: MediaQueryList | undefined

  const onChange = (event: MediaQueryListEvent): void => {
    systemPrefersDark.value = event.matches
  }

  onMounted(() => {
    if (typeof globalThis.matchMedia !== 'function') return
    query = globalThis.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = query.matches
    query.addEventListener('change', onChange)
  })

  onUnmounted(() => query?.removeEventListener('change', onChange))

  watchEffect(() => {
    const explicit = settings.state.value.theme
    const root = document.documentElement
    if (explicit === null) delete root.dataset['theme']
    else root.dataset['theme'] = explicit
  })

  const effectiveTheme = computed<Theme>(
    () => settings.state.value.theme ?? (systemPrefersDark.value ? 'dark' : 'light'),
  )

  function toggleTheme(): void {
    settings.setTheme(effectiveTheme.value === 'dark' ? 'light' : 'dark')
  }

  return { effectiveTheme, toggleTheme }
}

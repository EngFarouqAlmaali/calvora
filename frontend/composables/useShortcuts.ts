import { onMounted, onUnmounted } from 'vue'

export interface ShortcutHandlers {
  readonly focusExpression: () => void
  readonly selectMode: (index: number) => void
  readonly toggleAngleMode: () => void
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Global shortcuts. Typing, Enter, Escape and the arrow keys are handled by
 * the expression field itself; these work from anywhere on the page.
 *
 *   /          focus the expression field
 *   Alt+1/2    standard / scientific mode
 *   Alt+D      toggle degrees and radians
 */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return

    if (event.altKey && !event.shiftKey) {
      if (event.key === '1' || event.key === '2') {
        event.preventDefault()
        handlers.selectMode(Number(event.key) - 1)
      } else if (event.key.toLowerCase() === 'd') {
        event.preventDefault()
        handlers.toggleAngleMode()
      }
      return
    }

    if (event.key === '/' && !event.altKey && !isEditable(event.target)) {
      event.preventDefault()
      handlers.focusExpression()
    }
  }

  onMounted(() => globalThis.addEventListener('keydown', onKeydown))
  onUnmounted(() => globalThis.removeEventListener('keydown', onKeydown))
}

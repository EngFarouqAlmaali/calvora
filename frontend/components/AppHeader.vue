<script setup lang="ts">
import type { AngleMode, CalculatorModule, ModeId, Theme } from '@/types'

defineProps<{
  modules: readonly CalculatorModule[]
  mode: ModeId
  angleMode: AngleMode
  showAngleMode: boolean
  theme: Theme
}>()

const emit = defineEmits<{
  'select-mode': [mode: ModeId]
  'toggle-angle': []
  'toggle-theme': []
}>()
</script>

<template>
  <header class="header">
    <div class="brand">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path d="M42 22a14 14 0 1 0 0 20" fill="none" stroke="var(--bg)" stroke-width="6" stroke-linecap="round" />
      </svg>
      <span class="name">CALVORA</span>
    </div>

    <div class="controls">
      <div class="modes" role="group" aria-label="Calculator mode">
        <button
          v-for="(module, index) in modules"
          :key="module.id"
          type="button"
          class="mode"
          :aria-pressed="module.id === mode"
          :title="`${module.description} (Alt+${index + 1})`"
          @click="emit('select-mode', module.id)"
        >
          {{ module.label }}
        </button>
      </div>

      <button
        v-if="showAngleMode"
        type="button"
        class="chip"
        :title="'Switch angle unit (Alt+D)'"
        :aria-label="`Angle unit: ${angleMode === 'deg' ? 'degrees' : 'radians'}. Switch to ${angleMode === 'deg' ? 'radians' : 'degrees'}.`"
        @click="emit('toggle-angle')"
      >
        {{ angleMode === 'deg' ? 'Degrees' : 'Radians' }}
      </button>

      <button
        type="button"
        class="chip icon"
        :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="emit('toggle-theme')"
      >
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.mark {
  width: 2rem;
  height: 2rem;
  color: var(--ink);
}

.name {
  font-size: 1.15rem;
  font-weight: 750;
  letter-spacing: 0.14em;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.modes {
  display: inline-flex;
  padding: 3px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.mode {
  padding: 0.4rem 0.9rem;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-weight: 600;
}

.mode[aria-pressed='true'] {
  background: var(--accent);
  color: var(--on-accent);
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  font-weight: 600;
}

.chip.icon {
  width: 2.4rem;
  padding: 0;
}

@media (max-width: 30rem) {
  .mode {
    padding: 0.4rem 0.65rem;
  }

  .chip {
    padding: 0.4rem 0.6rem;
  }

  .chip.icon {
    padding: 0;
  }
}

@media (hover: hover) {
  .chip:hover,
  .mode[aria-pressed='false']:hover {
    border-color: var(--accent);
  }
}
</style>

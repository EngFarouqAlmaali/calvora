<script setup lang="ts">
import type { KeyAction, KeyDefinition } from '@/types'

defineProps<{
  keys: readonly KeyDefinition[]
  columns: number
}>()

const emit = defineEmits<{
  press: [action: KeyAction]
}>()
</script>

<template>
  <div class="keypad" role="group" aria-label="Calculator keys" :style="{ '--columns': columns }">
    <button
      v-for="key in keys"
      :key="key.id"
      type="button"
      class="key"
      :class="`key-${key.variant}`"
      :style="key.span && key.span > 1 ? { gridColumn: `span ${key.span}` } : undefined"
      :aria-label="key.ariaLabel"
      @mousedown.prevent
      @click="emit('press', key.action)"
    >
      {{ key.label }}
    </button>
  </div>
</template>

<style scoped>
.keypad {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  gap: 0.5rem;
}

.key {
  min-height: 3.25rem;
  padding: 0.25rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-key);
  background: var(--key-digit);
  font-family: var(--font-math);
  font-size: 1.15rem;
  transition: transform 80ms ease-out;
}

.key:active {
  transform: translateY(1px);
}

.key-operator {
  background: var(--key-operator);
  font-size: 1.3rem;
}

.key-function {
  background: var(--key-function);
  font-size: 1rem;
}

.key-action {
  background: var(--key-action);
}

.key-equals {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font-size: 1.5rem;
  font-weight: 700;
}

@media (hover: hover) {
  .key:hover {
    border-color: var(--accent);
  }
}
</style>

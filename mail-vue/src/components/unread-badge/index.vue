<template>
  <span v-if="count > 0" :key="arrival" class="unread-badge" :class="{ 'is-arriving': animating }"
        role="img" :aria-label="label || $t('unreadMessages', { count })"
        :title="label || $t('unreadMessages', { count })">
    {{ count > 99 ? '99+' : count }}
  </span>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUiStore } from '@/store/ui.js'

const props = defineProps({ count: { type: Number, default: 0 }, label: String, arrival: Number })
const ui = useUiStore()
const animating = ref(false)
watch(() => props.arrival, (id, _, onCleanup) => {
  animating.value = !!id && !ui.reduceMotion
  if (animating.value) {
    const timeout = window.setTimeout(() => { animating.value = false }, 700)
    onCleanup(() => window.clearTimeout(timeout))
  }
})
</script>

<style scoped>
.unread-badge {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 18px;
  padding-inline: 6px;
  border-radius: 9px;
  background: var(--mail-shell-badge);
  color: var(--mail-shell-badge-text);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
[aria-current='page'] > .unread-badge {
  background: color-mix(in srgb, var(--mac-accent) 18%, var(--mac-surface));
  color: var(--mac-selected-text);
}
.unread-badge.is-arriving {
  animation: unread-arrival 650ms ease-out both;
}
@keyframes unread-arrival {
  0%, 100% { scale: 1; }
  30% {
    scale: 1.18;
    background: var(--mac-accent);
    color: var(--mac-accent-text);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--mac-accent-ink) 18%, transparent);
  }
}
</style>

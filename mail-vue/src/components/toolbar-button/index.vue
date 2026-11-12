<template>
  <button type="button" class="toolbar-button" :aria-label="label" :data-tooltip="label"
          :aria-busy="showBusy || undefined" :aria-disabled="showBusy || undefined" :disabled="showBusy || disabled">
    <span class="toolbar-button-surface" aria-hidden="true" />
    <NavigationIcon :name="icon" :class="{ 'mail-spinner': showBusy }" />
  </button>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  busy: Boolean,
  disabled: Boolean,
})

// Keep very fast local refreshes perceptible without delaying their data update.
const showBusy = ref(false)
let busyStarted = 0
let busyTimer
watch(() => props.busy, busy => {
  clearTimeout(busyTimer)
  if (busy) {
    busyStarted = Date.now()
    showBusy.value = true
  } else {
    const remaining = props.icon === 'refresh' ? Math.max(0, 600 - (Date.now() - busyStarted)) : 0
    busyTimer = setTimeout(() => { showBusy.value = false }, remaining)
  }
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(busyTimer))

</script>

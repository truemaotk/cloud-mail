<template>
  <button type="button" class="toolbar-button" :aria-label="label" :title="label"
          :aria-busy="busy || undefined" :aria-disabled="busy || undefined" :disabled="busy || disabled">
    <NavigationIcon :name="icon" :class="{ 'mail-spinner': busy }" />
  </button>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  busy: Boolean,
  disabled: Boolean,
})

</script>

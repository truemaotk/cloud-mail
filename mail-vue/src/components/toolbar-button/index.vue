<template>
  <button type="button" class="toolbar-button" :aria-label="label" :title="label">
    <NavigationIcon :name="icon" />
  </button>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
})

</script>

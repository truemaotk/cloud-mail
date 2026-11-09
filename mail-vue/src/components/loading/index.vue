<template>
  <NavigationIcon name="loading" :size="size" class="mail-spinner" />
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'

defineProps({
  size: { type: Number, default: 30 },
})
</script>

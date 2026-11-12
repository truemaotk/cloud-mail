<template>
  <span v-if="labels.length" class="mail-label-chips" :title="labels.map(label => label.name).join(' · ')">
    <span v-for="label in labels.slice(0, 2)" :key="label.id" class="mail-label-chip"
          :style="{ '--tag-color': labelColors[label.color] }">{{ label.name }}</span>
    <span v-if="labels.length > 2" class="mail-label-more">+{{ labels.length - 2 }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { labelColors, useLabelsStore } from '@/store/labels.js'

const props = defineProps({ ids: { type: Array, default: () => [] } })
const store = useLabelsStore()
const labels = computed(() => props.ids.map(id => store.byId[id]).filter(Boolean))
</script>

<style scoped>
.mail-label-chips { display: inline-flex; align-items: center; gap: 3px; min-width: 0; max-width: 45%; }
.mail-label-chip, .mail-label-more {
  min-width: 0;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tag-color, var(--mac-accent)) 20%, var(--mac-surface));
  color: var(--mac-text);
  font-size: 10px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mail-label-more { flex: none; }
</style>

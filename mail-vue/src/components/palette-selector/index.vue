<template>
  <div class="palette-library" role="radiogroup" :aria-label="t('paletteTitle')">
    <section v-for="group in groups" :key="group.key" class="palette-group" :aria-label="t(group.label)">
      <h4>{{ t(group.label) }}</h4>
      <div class="palette-options">
    <label v-for="item in group.items" :key="item.key" class="palette-option"
           :class="{ 'is-selected': current === item.key }" :data-tooltip="`${t(item.label)} · ${item.origin} · ${item.swatch} (${t('paletteApproximate')})`">
      <input type="radio" :name="groupName" :value="item.key" :checked="current === item.key"
             @change="choose(item.key)">
      <span class="palette-swatch" :style="{ '--swatch': item.swatch }" aria-hidden="true">
        <span class="swatch-check" />
      </span>
      <span class="palette-name">{{ t(item.label) }}</span>
    </label>
      </div>
    </section>
    <p class="palette-current" aria-live="polite">{{ t(selected.label) }} · {{ selected.origin }} · {{ selected.swatch }} · {{ t('paletteApproximate') }}</p>
  </div>
</template>

<script setup>
import { computed, useId, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/store/ui.js'
import { palettes, paletteGroups, getPalette } from '@/utils/palettes.js'

const { t } = useI18n()
const uiStore = useUiStore()
const groupName = useId()
const current = computed(() => getPalette(uiStore.palette).key)
const selected = computed(() => getPalette(uiStore.palette))
const groups = paletteGroups.map(group => ({ ...group, items: palettes.filter(item => item.group === group.key) }))
let transitionTimer
onBeforeUnmount(() => {
  window.clearTimeout(transitionTimer)
  document.documentElement.classList.remove('palette-switching')
})

function choose(key) {
  const root = document.documentElement
  window.clearTimeout(transitionTimer)
  root.classList.add('palette-switching')
  uiStore.palette = key
  transitionTimer = window.setTimeout(() => root.classList.remove('palette-switching'), 420)
}
</script>

<style scoped>
.palette-library { display: grid; gap: 20px; max-width: 820px; }
.palette-group { min-width: 0; }
.palette-group h4 { margin: 0 0 8px; color: var(--mac-text-2); font-size: 12px; font-weight: 650; }
.palette-group + .palette-group { border-top: 1px solid var(--mac-line); padding-top: 16px; }
.palette-current { margin: 0; color: var(--mac-text-2); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.palette-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 12px 8px;
}
.palette-option:hover { background: var(--glass-control); box-shadow: var(--glass-control-shadow); }

.palette-option {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 10px;
  min-width: 56px;
  padding: 10px 4px;
  border-radius: var(--r-item);
  cursor: pointer;
}

.palette-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.palette-swatch {
  position: relative;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow: inset 0 0 0 .5px rgb(0 0 0 / 18%), inset 0 1px 0 rgb(255 255 255 / 20%);
  transition: transform var(--mac-dur-2) var(--mac-spring), box-shadow var(--mac-dur-2) ease;
}

.palette-option:hover .palette-swatch { transform: scale(1.06); }
.palette-option:active .palette-swatch { transform: scale(.94); }

.is-selected .palette-swatch {
  box-shadow: 0 0 0 3px var(--mac-surface), 0 0 0 5px var(--mac-accent);
}

.swatch-check {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mac-text);
  box-shadow: 0 0 0 2px var(--mac-surface);
  opacity: 0;
  transform: scale(.4);
  transition: opacity var(--mac-dur-2) ease, transform var(--mac-dur-3) var(--mac-spring);
}
.is-selected .swatch-check { opacity: 1; transform: none; }

.palette-name {
  color: var(--mac-text-2);
  font-size: var(--mac-fs-caption);
  line-height: var(--mac-lh-caption);
  text-align: center;
  overflow-wrap: anywhere;
}
.is-selected .palette-name { color: var(--mac-text); font-weight: 600; }

.palette-option:has(input:focus-visible) { outline: 2px solid var(--mac-focus); outline-offset: 0; }


</style>

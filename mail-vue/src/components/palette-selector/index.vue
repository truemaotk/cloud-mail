<template>
  <div class="palette-options" role="radiogroup" :aria-label="t('paletteTitle')">
    <label v-for="item in palettes" :key="item.key" class="palette-option"
           :class="{ 'is-selected': current === item.key }" :title="t(item.label)">
      <input type="radio" :name="groupName" :value="item.key" :checked="current === item.key"
             @change="choose(item.key)">
      <span class="palette-swatch" :style="{ '--swatch': uiStore.dark ? item.dark : item.light }" aria-hidden="true">
        <span class="swatch-check" />
      </span>
      <span class="palette-name">{{ t(item.label) }}</span>
    </label>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/store/ui.js'

const { t } = useI18n()
const uiStore = useUiStore()
const groupName = useId()
const current = computed(() => uiStore.palette || 'graphite')

// 色值与 style.css 里的 --pal / --pal-dark 保持一致
const palettes = [
  { key: 'graphite', label: 'paletteGraphite', light: '#2C2C2E', dark: '#E5E5EA' },
  { key: 'ocean', label: 'paletteOcean', light: '#1F5FBF', dark: '#7FB2FF' },
  { key: 'indigo', label: 'paletteIndigo', light: '#5452CC', dark: '#A5A3FF' },
  { key: 'sage', label: 'paletteSage', light: '#2D7457', dark: '#7FD1A8' },
  { key: 'terracotta', label: 'paletteTerracotta', light: '#A9512B', dark: '#F0A07C' },
  { key: 'rose', label: 'paletteRose', light: '#AE3B5C', dark: '#F29AB3' },
  { key: 'plum', label: 'palettePlum', light: '#7A3E8F', dark: '#D3A2E3' },
]

function choose(key) {
  const root = document.documentElement
  root.classList.add('palette-switching')
  uiStore.palette = key
  window.setTimeout(() => root.classList.remove('palette-switching'), 420)
}
</script>

<style scoped>
.palette-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.palette-option {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 56px;
  padding: 6px 4px;
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
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: var(--swatch);
  box-shadow: inset 0 0 0 .5px rgb(0 0 0 / 18%), inset 0 1px 0 rgb(255 255 255 / 20%);
  transition: transform var(--mac-dur-2) var(--mac-spring), box-shadow var(--mac-dur-2) ease;
}

.palette-option:hover .palette-swatch { transform: scale(1.06); }
.palette-option:active .palette-swatch { transform: scale(.94); }

.is-selected .palette-swatch {
  box-shadow: 0 0 0 2px var(--mac-surface), 0 0 0 4px var(--swatch);
}

.swatch-check {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  transform: scale(.4);
  transition: opacity var(--mac-dur-2) ease, transform var(--mac-dur-3) var(--mac-spring);
}
:global(html.dark) .swatch-check { background: #141416; }
.is-selected .swatch-check { opacity: 1; transform: none; }

.palette-name {
  color: var(--mac-text-2);
  font-size: var(--mac-fs-caption);
  line-height: var(--mac-lh-caption);
  white-space: nowrap;
}
.is-selected .palette-name { color: var(--mac-text); font-weight: 600; }

.palette-option:has(input:focus-visible) { outline: 2px solid var(--mac-focus); outline-offset: 0; }

@media (prefers-reduced-motion: reduce) {
  .palette-swatch, .swatch-check { transition: none; }
}
</style>

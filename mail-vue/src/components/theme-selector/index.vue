<template>
  <div class="theme-options" role="radiogroup" :aria-label="t('themeStyle')">
    <label
      v-for="option in themeOptions"
      :key="option.label"
      class="theme-card"
      :class="{ 'is-selected': uiStore.dark === option.dark }"
    >
      <span class="theme-preview" :class="{ 'preview-dark': option.dark }" aria-hidden="true">
        <span class="preview-sidebar"><i/><i/><i/></span>
        <span class="preview-main"><i/><i/><i/></span>
      </span>
      <span class="theme-caption">
        <span>{{ t(option.label) }}</span>
        <input
          type="radio"
          :name="groupName"
          :value="option.dark"
          :checked="uiStore.dark === option.dark"
          @change="selectTheme(option.dark, $event)"
        >
      </span>
    </label>
  </div>
</template>

<script setup>
import {useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {useUiStore} from '@/store/ui.js'

const {t} = useI18n()
const uiStore = useUiStore()
const groupName = useId()
const themeOptions = [
  {label: 'lightTheme', dark: false},
  {label: 'darkTheme', dark: true},
]

function selectTheme(dark, event) {
  const bounds = event.currentTarget.closest('.theme-card')?.getBoundingClientRect()
  changeDark(dark, {
    x: bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2,
    y: bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2,
  })
}

function changeDark(nextIsDark, origin) {
  if (nextIsDark === uiStore.dark) return

  const root = document.documentElement
  const applyTheme = () => {
    root.classList.toggle('dark', nextIsDark)
    const isMobile = !window.matchMedia("(pointer: fine) and (hover: hover)").matches
    document.getElementById('theme-color-meta')?.setAttribute(
      'content',
      nextIsDark ? '#161617' : '#F2F2F2'
    )
    uiStore.dark = nextIsDark
  }

  if (!document.startViewTransition) {
    applyTheme()
    return
  }

  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  )
  root.setAttribute('data-theme-to', nextIsDark ? 'dark' : 'light')
  root.style.setProperty('--vt-x', `${origin.x}px`)
  root.style.setProperty('--vt-y', `${origin.y}px`)
  root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)
  const transition = document.startViewTransition(applyTheme)
  transition.finished.finally(() => root.removeAttribute('data-theme-to'))
}
</script>

<style scoped lang="scss">
.theme-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: min(100%, 472px);
}

.theme-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 7px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;

  &:hover,
  &.is-selected {
    border-color: var(--el-color-primary);
  }

  &.is-selected {
    background: var(--mail-shell-rail);
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }
}

.theme-preview {
  display: flex;
  height: 64px;
  overflow: hidden;
  border: 1px solid #dfe1e5;
  border-radius: 4px;
  background: #ffffff;

  i {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: #e2e4e8;
  }

  .preview-sidebar {
    display: grid;
    align-content: start;
    gap: 5px;
    width: 28%;
    padding: 8px 6px;
    background: #f0f1f3;

    i:first-child {
      background: #cecece;
    }
  }

  .preview-main {
    display: grid;
    flex: 1;
    align-content: start;
    gap: 7px;
    padding: 8px;

    i:first-child {
      width: 55%;
    }
  }

  &.preview-dark {
    background: #202124;
    border-color: #45474b;

    i {
      background: #505359;
    }

    .preview-sidebar {
      background: #303236;

      i:first-child {
        background: #757575;
      }
    }
  }
}

.theme-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding-top: 4px;
  font-size: 14px;
  color: var(--el-text-color-primary);

  input {
    flex-shrink: 0;
    margin: 0;
    accent-color: var(--el-color-primary);
    cursor: pointer;
  }
}
</style>

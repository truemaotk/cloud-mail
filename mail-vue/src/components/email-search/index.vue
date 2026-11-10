<template>
  <form ref="searchRef" class="email-search" role="search" @submit.prevent="applySearch">
    <div class="search-bar">
      <button class="search-icon" type="submit" :aria-label="t('search')">
        <NavigationIcon name="search" :size="16" />
      </button>
      <input ref="inputRef" v-model="searchText" type="text" :aria-label="t('searchMail')"
             :placeholder="t('searchMail')" autocomplete="off" />
      <button v-if="searchText || appliedFilters" class="search-icon" type="button"
              :aria-label="t('mailClearSearch')" :title="t('mailClearSearch')" @click="resetSearch">
        <NavigationIcon name="close" :size="16" />
      </button>
      <kbd v-else-if="shortcut" class="search-shortcut" aria-hidden="true">/</kbd>
      <button ref="filterButton" class="search-icon filter-button" type="button"
              :aria-label="t('mailSearchFilters')" :title="t('mailSearchFilters')"
              :aria-expanded="visible" aria-controls="mail-search-filters" @click="toggleFilters">
        <NavigationIcon name="filter" :size="16" />
        <span v-if="appliedFilters" class="filter-dot" aria-hidden="true" />
      </button>
    </div>
    <Transition name="search-panel">
      <section v-if="visible" id="mail-search-filters" class="search-filters" :aria-label="t('mailSearchFilters')">
        <div class="search-filter-title">{{ t('searchType') }}</div>
        <el-segmented v-model="searchType" :options="searchOptions" :props="{ label: 'label', value: 'type' }" />
        <div v-if="!hideDates" class="search-dates">
          <label>
            <span>{{ t('searchDateFrom') }}</span>
            <el-date-picker v-model="startDate" type="date" :editable="false" :teleported="false"
                            value-format="YYYY-MM-DD" :placeholder="t('searchStartDate')" />
          </label>
          <label>
            <span>{{ t('searchDateTo') }}</span>
            <el-date-picker v-model="endDate" type="date" :editable="false" :teleported="false"
                            value-format="YYYY-MM-DD" :placeholder="t('searchEndDate')" :disabled-date="disableEndDate" />
          </label>
        </div>
        <div class="search-actions">
          <el-button @click="resetSearch">{{ t('reset') }}</el-button>
          <el-button type="primary" @click="applySearch">{{ t('search') }}</el-button>
        </div>
      </section>
    </Transition>
  </form>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  store: { type: Object, required: true },
  searchOptions: { type: Array, required: true },
  shortcut: Boolean,
  hideDates: Boolean,
})
const emit = defineEmits(['search', 'reset'])
const { t } = useI18n()
const searchRef = ref(null)
const inputRef = ref(null)
const filterButton = ref(null)
const searchText = ref('')
const searchType = ref('subject')
const startDate = ref('')
const endDate = ref('')
const visible = ref(false)
const defaultType = computed(() => props.searchOptions[0]?.type || 'subject')
const appliedFilters = computed(() => {
  const params = props.store.searchParams
  return !!(params.startDate || params.endDate || (params.text && params.type !== defaultType.value))
})

function restoreFilters() {
  const params = props.store.searchParams
  searchType.value = props.searchOptions.some(option => option.type === params.type) ? params.type : defaultType.value
  startDate.value = localDate(params.startDate)
  endDate.value = localDate(params.endDate)
}

watch(() => [props.store.searchParams, props.searchOptions], () => {
  searchText.value = props.store.searchParams.text || ''
  restoreFilters()
  visible.value = false
}, { immediate: true })

watch(startDate, value => {
  if (value && endDate.value && endDate.value < value) endDate.value = ''
})

function toggleFilters() {
  if (visible.value) closeFilters()
  else visible.value = true
}

function closeFilters() {
  visible.value = false
  restoreFilters()
}

function disableEndDate(date) {
  return !!startDate.value && date < new Date(startDate.value + 'T00:00:00')
}

function localDate(value) {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T') + 'Z')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return [date.getFullYear(), month, day].join('-')
}

function searchDate(value, endOfDay = false) {
  if (!value) return ''
  const time = endOfDay ? 'T23:59:59' : 'T00:00:00'
  return new Date(value + time).toISOString().slice(0, 19).replace('T', ' ')
}

function applySearch() {
  props.store.setSearchParams({
    text: searchText.value.trim(),
    type: searchType.value,
    startDate: searchDate(startDate.value),
    endDate: searchDate(endDate.value, true),
  })
  visible.value = false
  emit('search')
}

function resetSearch() {
  props.store.setSearchParams({ text: '', type: defaultType.value, startDate: '', endDate: '' })
  visible.value = false
  emit('reset')
  inputRef.value?.focus()
}

function onDocumentPointer(event) {
  if (visible.value && !searchRef.value?.contains(event.target)) closeFilters()
}

function onDocumentKey(event) {
  if (event.key === 'Escape' && visible.value && !event.target?.closest?.('.el-picker-panel')) {
    event.preventDefault()
    event.stopPropagation()
    closeFilters()
    filterButton.value?.focus()
    return
  }
  const shortcut = (event.key === '/' && !event.ctrlKey && !event.metaKey)
    || (event.key === 'k' && (event.ctrlKey || event.metaKey))
  if (props.shortcut && shortcut && !event.defaultPrevented
      && !event.target?.closest?.('input, textarea, select, [contenteditable], .write-box')) {
    event.preventDefault()
    inputRef.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  document.addEventListener('keydown', onDocumentKey, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  document.removeEventListener('keydown', onDocumentKey, true)
})
</script>

<style scoped>
.email-search { position: relative; z-index: 15; flex: 0 1 300px; min-width: 180px; }
.search-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  padding: 0 3px 0 4px;
  border: 1px solid var(--mac-line);
  border-radius: var(--mail-radius-control);
  background: var(--mac-chrome);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.search-bar:focus-within {
  border-color: var(--mac-focus);
  background: var(--mac-surface);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--mac-focus) 22%, transparent);
}
.search-bar input {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  font-size: var(--mac-fs-chrome);
  outline: none;
}
.search-bar input::placeholder { color: var(--mac-text-3); }
.search-icon {
  position: relative;
  display: grid;
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 6px;
  color: var(--mac-text-2);
  cursor: pointer;
}
.search-icon:hover, .filter-button[aria-expanded='true'] { background: var(--mac-hover); color: var(--el-text-color-primary); }
.search-icon:focus-visible { outline: 2px solid var(--mac-focus); outline-offset: -2px; }
.search-shortcut {
  min-width: 18px;
  margin-inline-end: 2px;
  padding: 0 5px;
  border: 1px solid var(--mac-line);
  border-radius: 4px;
  background: var(--mac-surface);
  color: var(--mac-text-2);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}
.filter-dot { position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--mac-accent); }
.search-filters {
  position: absolute;
  inset-block-start: calc(100% + 6px);
  inset-inline-end: 0;
  width: min(440px, calc(100vw - 24px));
  padding: 16px;
  border: 1px solid var(--mac-line);
  border-radius: var(--mail-radius-menu);
  background: var(--mac-chrome);
  box-shadow: var(--mac-shadow-pop);
}
.search-filter-title { margin-bottom: 8px; font-size: var(--mac-fs-chrome); line-height: var(--mac-lh-chrome); font-weight: 600; }
.search-filters :deep(.el-segmented) { max-width: 100%; }
.search-dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.search-dates label { display: grid; gap: 4px; min-width: 0; font-size: var(--mac-fs-caption); color: var(--mac-text-2); }
.search-dates :deep(.el-date-editor) { width: 100%; }
.search-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
.search-panel-enter-active, .search-panel-leave-active { transition: opacity 140ms ease, translate 140ms ease; }
.search-panel-enter-from, .search-panel-leave-to { opacity: 0; translate: 0 -4px; }
@media (max-width: 767px) {
  .email-search { flex: 1 1 auto; }
  .search-shortcut { display: none; }
  .search-filters { width: min(440px, calc(100vw - 20px)); }
}
@media (prefers-reduced-motion: reduce) {
  .search-panel-enter-active, .search-panel-leave-active { transition: none; }
}
</style>

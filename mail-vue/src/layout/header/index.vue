<template>
  <div class="header" :class="{ 'workspace-header': folder }">
    <div class="header-btn">
      <ToolbarButton
        icon="panel-left"
        class="sidebar-toggle"
        :label="$t('toggleMailNavigation')"
        :aria-expanded="uiStore.asideShow"
        aria-controls="mail-sidebar"
        @click="changeAside"
      />
      <h1 class="breadcrumb-item">{{ labelTitle || $t(currentFolder ? currentFolder.label : route.meta.title) }}</h1>
    </div>
    <div v-perm="'email:send'" class="writer-box">
      <ToolbarButton class="mail-compose-trigger" icon="compose" :label="$t('compose')" @click="openSend" />
    </div>
    <div v-if="currentFolder" class="workspace-tools">
      <div class="layout-switch" role="radiogroup" :aria-label="$t('mailReadingLayout')">
        <span class="layout-thumb" :class="{ 'is-wide': uiStore.wideReading }" aria-hidden="true" />
        <button type="button" role="radio" class="layout-option" :aria-checked="!uiStore.wideReading"
                :aria-label="$t('mailSplitReading')" :title="$t('mailSplitReading')" @click="setReadingLayout('split')">
          <NavigationIcon name="columns" :size="16" />
        </button>
        <button type="button" role="radio" class="layout-option" :aria-checked="uiStore.wideReading"
                :aria-label="$t('mailWideReading')" :title="$t('mailWideReading')" @click="setReadingLayout('wide')">
          <NavigationIcon name="rows" :size="16" />
        </button>
      </div>
      <email-search
        :store="searchStore"
        :search-options="searchOptions"
        :hide-dates="folder === 'all-mail'"
        shortcut
        @search="returnToList"
        @reset="returnToList"
      />
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import ToolbarButton from '@/components/toolbar-button/index.vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useRoute} from "vue-router";
import {computed} from "vue";
import { workspaceFolders, workspaceFolder } from '@/utils/mail-workspace.js'
import {useI18n} from "vue-i18n";
import emailSearch from '@/components/email-search/index.vue'
import {useEmailStore} from '@/store/email.js'
import {useSendStore} from '@/store/send.js'
import { useLabelsStore } from '@/store/labels.js'

const {t} = useI18n();
const route = useRoute();
const folder = computed(() => workspaceFolder(route))
const currentFolder = computed(() => workspaceFolders.find(item => item.path === folder.value))
const labels = useLabelsStore()
const labelTitle = computed(() => folder.value === 'inbox' && labels.byId[Number(route.query.label)]?.name)
const uiStore = useUiStore();
const emailStore = useEmailStore()
const sendStore = useSendStore()
const inboxSearchOptions = computed(() => [
  {label: t('titleDesc'), type: 'subject'},
  {label: t('searchSummaryContent'), type: 'content'},
  {label: t('sender'), type: 'sender'},
  {label: t('searchSenderAddress'), type: 'senderAddress'},
])
const sentSearchOptions = computed(() => [
  {label: t('titleDesc'), type: 'subject'},
  {label: t('searchSummaryContent'), type: 'content'},
  {label: t('searchRecipientAddress'), type: 'recipientAddress'},
])
const adminSearchOptions = computed(() => [
  {label: t('sender'), type: 'name'},
  {label: t('subject'), type: 'subject'},
  {label: t('user'), type: 'userEmail'},
  {label: t('selectEmail'), type: 'accountEmail'},
])
const searchStore = computed(() => {
  if (folder.value === 'all-mail') {
    return { searchParams: emailStore.adminSearch, setSearchParams: emailStore.setAdminSearch }
  }
  return folder.value === 'sent' ? sendStore : emailStore
})
const searchOptions = computed(() => folder.value === 'all-mail' ? adminSearchOptions.value
  : folder.value === 'sent' ? sentSearchOptions.value : inboxSearchOptions.value)
function returnToList() {
  if (route.meta.name !== 'content') return
  if (currentFolder.value) router.replace({ name: currentFolder.value.name, query: labelTitle.value ? { label: route.query.label } : undefined })
}

function setReadingLayout(layout) {
  uiStore.wideReading = layout === 'wide'
}

function openSend(event) {
  uiStore.writerRef.open(event.currentTarget)
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
  padding-inline: var(--mail-shell-gutter);
  position: relative;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

@media (min-width: 1025px) {
  .header { padding-block-start: calc(var(--mail-titlebar-center) * 2 - var(--mail-shell-header)); }
}

.sidebar-toggle.toolbar-button {
  margin-inline-start: -4px;
}

.breadcrumb-item {
  color: var(--el-text-color-primary);
  font-size: var(--mac-fs-title);
  line-height: var(--mac-lh-title);
  font-weight: 600;
  letter-spacing: -.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.writer-box {
  display: none;
}

.workspace-tools {
  display: flex;
  flex: 1 1 auto;
  justify-content: flex-end;
  gap: 16px;
  align-items: center;
  min-width: 0;
}

/* 分段控件：玻璃胶囊 + 弹簧滑块 */
.layout-switch {
  position: relative;
  display: inline-grid;
  grid-template-columns: 30px 30px;
  flex: none;
  padding: 3px;
  border-radius: 999px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-edge), 0 0 0 .5px rgb(0 0 0 / 8%), 0 2px 8px rgb(0 0 0 / 6%);
}

.layout-thumb {
  position: absolute;
  inset-block: 3px;
  inset-inline-start: 3px;
  width: 30px;
  border-radius: 999px;
  background: var(--mac-surface);
  box-shadow: 0 0 0 .5px rgb(0 0 0 / 8%), 0 1px 3px rgb(0 0 0 / 14%);
  transition: transform var(--mac-slide-duration) var(--mac-slide-ease);
}
:global(html.dark) .layout-thumb { background: var(--mac-chrome); }
.layout-thumb.is-wide { transform: translateX(30px); }

.layout-option {
  position: relative;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 999px;
  color: var(--mac-text-2);
  cursor: pointer;
  transition: color var(--mac-dur-2) ease;
}

.layout-option:hover { color: var(--mac-text); }
.layout-option[aria-checked='true'] { color: var(--mac-text); }
.layout-option:focus-visible { outline: none; outline: 2px solid var(--mac-focus); outline-offset: 1px; }

@media (max-width: 1024px) { .layout-switch { display: none; } }

@media (max-width: 767px) {
  .header { gap: 8px; }
  .header-btn { flex: 1; }
  .writer-box { display: flex; flex-shrink: 0; }
  .workspace-header .header-btn { flex: none; }
  .workspace-header .breadcrumb-item { display: none; }
}


</style>

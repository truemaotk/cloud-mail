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
      <h1 class="breadcrumb-item" :class="{ 'workspace-title': folder }">{{ $t(route.meta.title) }}</h1>
    </div>
    <div v-perm="'email:send'" class="writer-box">
      <ToolbarButton icon="compose" :label="$t('compose')" @click="openSend" />
    </div>
    <email-search
      v-if="folder"
      :store="searchStore"
      :search-options="searchOptions"
      :hide-dates="folder === 'all-mail'"
      shortcut
      @search="returnToList"
      @reset="returnToList"
    />
    <div v-if="currentFolder" class="workspace-tools">
      <span class="workspace-folder">
        <NavigationIcon :name="currentFolder.icon" :size="16" />
        {{ $t(currentFolder.label) }}
      </span>
      <el-dropdown trigger="click" placement="bottom-end" :show-arrow="false" @command="setReadingLayout">
        <button type="button" class="workspace-layout-button" :aria-label="$t('mailReadingLayout')">
          <NavigationIcon :name="uiStore.wideReading ? 'mail' : 'panel-left'" :size="17" />
          <span>{{ $t(uiStore.wideReading ? 'mailWideReading' : 'mailSplitReading') }}</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="split">
              <NavigationIcon :name="uiStore.wideReading ? 'panel-left' : 'mail-delivered'" :size="16" />
              {{ $t('mailSplitReading') }}
            </el-dropdown-item>
            <el-dropdown-item command="wide">
              <NavigationIcon :name="uiStore.wideReading ? 'mail-delivered' : 'mail'" :size="16" />
              {{ $t('mailWideReading') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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

const {t} = useI18n();
const route = useRoute();
const folder = computed(() => workspaceFolder(route))
const currentFolder = computed(() => workspaceFolders.find(item => item.path === folder.value))
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
  if (currentFolder.value) router.replace({ name: currentFolder.value.name })
}

function setReadingLayout(layout) {
  uiStore.wideReading = layout === 'wide'
}

function openSend() {
  uiStore.writerRef.open()
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

</script>

<style scoped>
.header {
  --header-gap: 12px;
  display: flex;
  align-items: center;
  height: 100%;
  gap: var(--header-gap);
  padding-inline: var(--mail-shell-gutter);
  position: relative;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: var(--header-gap);
  min-width: 0;
}

.breadcrumb-item {
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.writer-box {
  display: none;
}

.workspace-header .workspace-title {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}
.workspace-tools {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-inline-start: auto;
  white-space: nowrap;
}
.workspace-folder,
.workspace-layout-button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  color: var(--mail-shell-muted);
  font-size: 13px;
}
.workspace-layout-button {
  min-height: 36px;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-control);
  color: var(--el-text-color-primary);
  cursor: pointer;
}
.workspace-layout-button:hover { background: var(--mail-shell-hover); }

@media (max-width: 1024px) { .workspace-tools { display: none; } }

@media (max-width: 767px) {
  .header {
    --header-gap: 8px;
  }

  .header-btn {
    flex: 1;
  }

  .writer-box {
    display: flex;
    flex-shrink: 0;
  }
  .workspace-header .header-btn { flex: none; }

}
</style>

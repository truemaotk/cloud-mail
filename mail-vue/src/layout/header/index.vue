<template>
  <div class="header">
    <div class="header-btn">
      <ToolbarButton
        icon="panel-left"
        class="sidebar-toggle"
        :label="$t('toggleMailNavigation')"
        :aria-expanded="uiStore.asideShow"
        aria-controls="mail-sidebar"
        @click="changeAside"
      />
      <h1 class="breadcrumb-item">{{ $t(route.meta.title) }}</h1>
    </div>
    <div v-perm="'email:send'" class="writer-box">
      <ToolbarButton icon="compose" :label="$t('compose')" @click="openSend" />
    </div>
    <email-search
      v-if="showInboxSearch"
      :store="emailStore"
      :search-options="inboxSearchOptions"
      :class="{ 'account-show': accountPanelShow }"
      @search="returnToList('email')"
      @reset="returnToList('email')"
    />
    <email-search
      v-else-if="showSentSearch"
      :store="sendStore"
      :search-options="sentSearchOptions"
      :class="{ 'account-show': accountPanelShow }"
      @search="returnToList('send')"
      @reset="returnToList('send')"
    />
  </div>
</template>

<script setup>
import router from "@/router";
import ToolbarButton from '@/components/toolbar-button/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useRoute} from "vue-router";
import {computed} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import emailSearch from '@/components/email-search/index.vue'
import {useEmailStore} from '@/store/email.js'
import {useSendStore} from '@/store/send.js'

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
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
const accountPanelShow = computed(() =>
  uiStore.accountShow && settingStore.settings.manyEmail === 0 && hasPerm('account:query')
)
const showInboxSearch = computed(() =>
  route.meta.name === 'email' || isMailboxDetail('inbox')
)
const showSentSearch = computed(() =>
  route.meta.name === 'send' || isMailboxDetail('sent')
)

function isMailboxDetail(mailbox) {
  return route.meta.name === 'content' && route.params.mailbox === mailbox
}

function returnToList(listName) {
  if (route.meta.name !== 'content') return
  router.push({name: listName})
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
  display: flex;
  align-items: center;
  height: 100%;
  gap: 14px;
  padding-inline: var(--mail-shell-gutter);
  position: relative;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 11px;
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

@media (max-width: 767px) {
  .header {
    gap: 8px;
  }

  .header-btn {
    flex: 1;
  }

  .writer-box {
    display: flex;
    flex-shrink: 0;
  }

}
</style>

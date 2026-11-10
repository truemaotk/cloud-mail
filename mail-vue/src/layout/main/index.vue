<template>
  <div class="main-box-hide" :class="{ 'workspace-main': folder }">
    <router-view v-slot="{ Component,route }">
      <Transition name="mail-page" mode="out-in">
        <keep-alive :include="['sys-setting','user','role','analysis','reg-key']">
          <MailWorkspace v-if="folder" key="mail-workspace" :folder="folder" />
          <component v-else :is="Component" :key="route.name"/>
        </keep-alive>
      </Transition>
    </router-view>
  </div>
</template>
<script setup>
import MailWorkspace from '@/views/mail-workspace/index.vue'
import { workspaceFolder } from '@/utils/mail-workspace.js'
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {computed, watch} from "vue";
import { useRoute } from 'vue-router'

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()

let elNotification = null

const folder = computed(() => workspaceFolder(route))

watch(() => uiStore.changeNotice, () => {

  const settings = settingStore.settings

  let data = {
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
    noticeType: settings.noticeType,
    noticeDuration: settings.noticeDuration,
    noticePosition: settings.noticePosition,
    noticeOffset: settings.noticeOffset
  }

  showNotice(data)
})

watch(() => uiStore.changePreview, () => {
  showNotice(uiStore.previewData)
})

function showNotice(data) {

  if (data.notice === 1) {
    return;
  }

  if (elNotification) {
    elNotification.close()
  }

  const style = document.createElement('style');
  style.innerHTML = `
  .custom-notice.el-notification {
    --el-notification-width: min(${data.noticeWidth}px,calc(100% - 30px)) !important;
  }
  `;

  document.head.appendChild(style);

  elNotification = ElNotification({
    title: data.noticeTitle,
    message: `<div style="width: 100%;height: 100%;">${data.noticeContent}</div>`,
    type: data.noticeType === 'none' ? '' : data.noticeType,
    duration: data.noticeDuration,
    position: data.noticePosition,
    offset: data.noticeOffset,
    dangerouslyUseHTMLString: true,
    customClass: 'custom-notice'
  })
}

</script>
<style lang="scss" scoped>
.main-box-hide {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  height: calc(100% - var(--mail-shell-header));
  padding-inline: var(--mail-shell-gutter);
}

.mail-page-enter-active { transition: opacity 180ms ease-out; }
.mail-page-leave-active { transition: opacity 95ms ease-in; }
.mail-page-enter-from, .mail-page-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .mail-page-enter-active, .mail-page-leave-active { transition: none; }
}
</style>

<template>
  <el-container class="layout" :class="{ 'mail-shell-dark': uiStore.dark }">
    <el-aside
        id="mail-sidebar"
        class="aside"
        :inert="isMobile && !uiStore.asideShow"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside :compact="!isMobile && !uiStore.asideShow" />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
    <writer ref="writerRef" />
  </el-container>
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {useUiStore} from "@/store/ui.js";
import { useEmailStore } from '@/store/email.js'
import { useSettingStore } from '@/store/setting.js'
import writer from '@/layout/write/index.vue'
import { userDraftStore } from '@/store/draft.js'
import db from '@/db/db.js'

const uiStore = useUiStore();
const emailStore = useEmailStore()
const settingStore = useSettingStore()
const drafts = userDraftStore()
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
let unreadTimer

function refreshUnreadCounts() {
  if (!document.hidden) emailStore.refreshUnreadCounts()
}

watch(() => emailStore.deleteIds, refreshUnreadCounts)
watch(() => [db.value, drafts.refreshList], async ([database], _, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  try {
    const count = await database.draft.count()
    if (active) drafts.count = count
  } catch {
    if (active) drafts.count = 0
  }
}, { immediate: true })
const handleResize = () => {
  const nextIsMobile = window.innerWidth < 1025
  if (isMobile.value !== nextIsMobile) {
    isMobile.value = nextIsMobile
    uiStore.asideShow = !nextIsMobile
  }
}

onMounted(() => {
  uiStore.writerRef = writerRef

  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', refreshUnreadCounts)
  refreshUnreadCounts()
  unreadTimer = window.setInterval(() => {
    if (settingStore.settings.autoRefresh > 1) refreshUnreadCounts()
  }, 30000)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', refreshUnreadCounts)
  window.clearInterval(unreadTimer)
  emailStore.clearUnreadCounts()
})
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
}

.aside-show {
  transform: translateX(0);
  z-index: 101;
  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    height: 100%;
    background: var(--el-bg-color);
  }
}

.el-aside {
  width: min(var(--mail-sidebar-width), calc(100vw - 24px));
  border-inline-end: 1px solid var(--mail-shell-line);
  transition: transform 180ms ease;
}

@media (min-width: 1025px) {
  .el-aside {
    position: relative;
    flex: none;
    width: var(--mail-sidebar-width);
    overflow: visible;
    transform: none;
    transition: width 190ms cubic-bezier(.2, .7, .3, 1);
  }

  .el-aside-hide {
    width: var(--mail-sidebar-compact-width);
  }
}

.layout {
  --mail-sidebar-width: 244px;
  --mail-sidebar-compact-width: 64px;
  --mail-shell-sidebar: #f5f5f5;
  --mail-shell-rail: #fafafa;
  --mail-shell-line: #e6e6e6;
  --mail-shell-hover: #ededed;
  --mail-shell-active: #e7e7e7;
  --mail-shell-muted: #626262;
  --mail-shell-marker: #353535;
  --mail-shell-badge: #dedede;
  --mail-shell-badge-text: #303030;
  --mail-shell-action: var(--el-color-primary);
  --mail-shell-action-hover: #414141;
  --mail-shell-action-text: var(--mail-primary-text);
  --mail-shell-header: 64px;
  --mail-shell-toolbar: 44px;
  --mail-shell-gutter: 16px;
  --mail-shell-control: 32px;
  --workspace-toolbar: 56px;
  --mailbox-rail-width: 244px;
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}

.mail-shell-dark {
  --mail-shell-sidebar: #1b1b1b;
  --mail-shell-rail: #191919;
  --mail-shell-line: #353535;
  --mail-shell-hover: #2c2c2c;
  --mail-shell-active: #373737;
  --mail-shell-muted: #b4b4b4;
  --mail-shell-marker: #e3e3e3;
  --mail-shell-badge: #444;
  --mail-shell-badge-text: #f1f1f1;
  --mail-shell-action-hover: #d6d6d6;
}

.main-container {
  min-height: 100%;
  background: var(--el-bg-color);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.el-main {
  padding: 0;
}

.el-header {
  --el-header-height: var(--mail-shell-header);
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--mail-shell-line);
  padding: 0;
}

@media (max-width: 767px) {
  .layout {
    --mail-shell-header: 54px;
    --mail-shell-gutter: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .el-aside {
    transition: none;
  }
}

.overlay-show {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  transition: all 0.3s;
}

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}
</style>

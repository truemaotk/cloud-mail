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
  }
}

.el-aside {
  width: min(calc(var(--mail-sidebar-width) + var(--mail-sidebar-inset)), calc(100vw - 24px));
  padding: var(--mail-sidebar-inset) 0 var(--mail-sidebar-inset) var(--mail-sidebar-inset);
  background: transparent;
  transition: transform var(--mac-dur-3) var(--mac-ease);
}

@media (min-width: 1025px) {
  .el-aside {
    position: relative;
    flex: none;
    width: calc(var(--mail-sidebar-width) + var(--mail-sidebar-inset));
    overflow: visible;
    transform: none;
    transition: width var(--mac-dur-3) var(--mac-ease);
  }

  .el-aside-hide {
    width: calc(var(--mail-sidebar-compact-width) + var(--mail-sidebar-inset));
  }
}

.layout {
  --mail-sidebar-width: 232px;
  --mail-sidebar-compact-width: 60px;
  --mail-sidebar-inset: 8px;
  --mail-shell-sidebar: var(--mac-sidebar);
  --mail-shell-rail: var(--mac-chrome);
  --mail-shell-line: var(--mac-line);
  --mail-shell-hover: var(--mac-hover);
  --mail-shell-active: var(--mac-selected);
  --mail-shell-active-text: var(--mac-selected-text);
  --mail-shell-muted: var(--mac-text-2);
  --mail-shell-marker: var(--mac-accent);
  --mail-shell-badge: var(--mac-badge);
  --mail-shell-badge-text: var(--mac-badge-text);
  --mail-shell-action: var(--mac-accent);
  --mail-shell-action-hover: var(--mac-accent-hover);
  --mail-shell-action-text: var(--mac-accent-text);
  --mail-shell-header: var(--mac-toolbar);
  --mail-shell-toolbar: 44px;
  --mail-shell-gutter: 16px;
  --mail-shell-control: var(--mac-hit);
  --workspace-toolbar: var(--mac-pane-bar);
  --mailbox-rail-width: 232px;
  --mail-list-width: 352px;
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
  background: var(--mac-wallpaper);
}

.main-container {
  min-height: 100%;
  background: transparent;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.el-main {
  padding: 0;
}

.el-header {
  --el-header-height: var(--mail-shell-header);
  background: transparent;
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
  background: rgb(0 0 0 / 18%);
  z-index: 99;
  transition: opacity var(--mac-dur-2) ease;
}

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}
</style>

<template>
  <el-container class="layout" :class="{ 'mail-shell-dark': uiStore.dark, 'mobile-nav-open': isMobile && uiStore.asideShow }">
    <el-aside
        id="mail-sidebar"
        ref="sidebarRef"
        class="aside"
        :role="isMobile && uiStore.asideShow ? 'dialog' : undefined"
        :aria-modal="isMobile && uiStore.asideShow ? true : undefined"
        :aria-label="$t('mailNavigation')"
        @keydown="onSidebarKeydown"
        :inert="isMobile && !uiStore.asideShow"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside :compact="!isMobile && !uiStore.asideShow" />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container" :inert="isMobile && uiStore.asideShow">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
    <writer ref="writerRef" />
    <LabelDialog />
  </el-container>
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import {useUiStore} from "@/store/ui.js";
import { useEmailStore } from '@/store/email.js'
import { playNewMailSound, prepareNewMailSound } from '@/utils/new-mail-sound.js'
import writer from '@/layout/write/index.vue'
import LabelDialog from '@/components/label-dialog/index.vue'
import { userDraftStore } from '@/store/draft.js'
import db from '@/db/db.js'

const uiStore = useUiStore();
const emailStore = useEmailStore()
const drafts = userDraftStore()
const writerRef = ref({})
const sidebarRef = ref(null)
let navigationTrigger
const isMobile = ref(window.innerWidth < 1025)
let unreadTimer

function onSidebarKeydown(event) {
  if (!isMobile.value || !uiStore.asideShow) return
  if (event.key === 'Escape') {
    event.preventDefault()
    uiStore.asideShow = false
  } else if (event.key === 'Tab') {
    const controls = [...sidebarRef.value.$el.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
      .filter(element => element.getClientRects().length && !element.closest('[inert]'))
    const first = controls[0], last = controls[controls.length - 1]
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first)?.focus()
    }
  }
}

watch(() => isMobile.value && uiStore.asideShow, async open => {
  if (open) {
    navigationTrigger = document.activeElement
    await nextTick()
    sidebarRef.value?.$el.querySelector('button')?.focus()
  } else if (isMobile.value) {
    await nextTick()
    const focused = document.activeElement
    if (focused === document.body || sidebarRef.value?.$el.contains(focused)) {
      navigationTrigger?.focus()
    }
  }
})

function refreshUnreadCounts() {
  if (!document.hidden) emailStore.refreshUnreadCounts()
}

watch(() => emailStore.deleteIds, refreshUnreadCounts)
const canPlayMailSound = () => uiStore.newMailSound && !document.hidden
watch(() => emailStore.newMail, (arrival, previous) => {
  if (arrival && arrival.id !== previous?.id && canPlayMailSound()) playNewMailSound(canPlayMailSound)
})

function enableSoundOnInteraction() {
  if (uiStore.newMailSound) prepareNewMailSound()
}
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
  document.addEventListener('click', enableSoundOnInteraction, true)
  document.addEventListener('keydown', enableSoundOnInteraction, true)
  refreshUnreadCounts()
  unreadTimer = window.setInterval(refreshUnreadCounts, 30000)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', refreshUnreadCounts)
  document.removeEventListener('click', enableSoundOnInteraction, true)
  document.removeEventListener('keydown', enableSoundOnInteraction, true)
  window.clearInterval(unreadTimer)
  emailStore.clearUnreadCounts()
})
</script>

<style lang="scss" scoped>
/* Mobile navigation floats as an inset sheet; the current page stays visible. */
@media (max-width: 1024px) {
  .layout.mobile-nav-open .el-aside.aside-show {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: 12px;
    width: min(296px, calc(100vw - 56px));
    height: auto;
    padding: 0;
    overflow: visible;
    transform: none;
    animation: mac-nav-in var(--mac-dur-3) var(--mac-ease-out) both;
  }
  .layout.mobile-nav-open .overlay-show { display: block; backdrop-filter: blur(2px); }
}
@keyframes mac-nav-in { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
@keyframes mac-main-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }

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
  @media (max-width: 1024px) {
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
    transition: width var(--mac-slide-duration) var(--mac-slide-ease);
  }

  .el-aside-hide {
    width: calc(var(--mail-sidebar-compact-width) + var(--mail-sidebar-inset));
  }
}

.layout {
  --mail-sidebar-width: 232px;
  --mail-sidebar-compact-width: 60px;
  --mail-sidebar-inset: 10px;
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
  --mail-shell-gutter: 10px;
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
  scrollbar-width: none;
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

/* One desktop titlebar axis for the mailbox, title, layout switch and search.
   Its lower edge also lines up the content panel with the compose row. */
@media (min-width: 1025px) {
  .layout {
    --mail-shell-header: 66px;
    --mail-titlebar-center: 46px;
  }
}

/* 桌面端各页面自己滚动，外层不出现贴边的页面滚动条 */
@media (min-width: 1025px) {
  .main-container { overflow: hidden; }
}

@media (max-width: 767px) {
  .layout {
    --mail-shell-header: 54px;
    --mail-shell-gutter: 10px;
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

<template>
  <div class="mailbox-switcher" :class="{ 'is-compact': compact }">
    <el-tooltip
      v-model:visible="open"
      trigger="click"
      role="dialog"
      :aria-label="$t('mailboxSwitcher')"
      :placement="compact ? 'right-start' : 'bottom-start'"
      :offset="compact ? 10 : -1"
      :show-arrow="false"
      :teleported="false"
      persistent
      effect="light"
      popper-class="mailbox-switch-popover"
      @show="focusSelectedMailbox"
    >
      <button ref="trigger" type="button" class="mailbox-switch-trigger"
              :aria-label="compact ? $t('mailboxSwitcher') + ' ' + currentAddress : undefined"
              :data-rail-label="compact ? $t('mailboxSwitcher') : undefined"
              aria-controls="sidebar-mailbox-picker" :aria-expanded="open" aria-haspopup="dialog"
              @keydown="rememberKeyboard" @keydown.esc.stop="closeFromKeyboard"
              @pointerdown="keyboardOpening = false">
        <span class="mailbox-switch-icon"><NavigationIcon name="mail" :size="18" /></span>
        <span class="mailbox-switch-label">
          <strong>{{ $t('mailboxSwitcher') }}</strong>
          <span :title="currentAddress">{{ currentAddress }}</span>
        </span>
        <NavigationIcon class="disclosure-chevron" name="chevron" :size="15" />
      </button>
      <template #content>
        <section id="sidebar-mailbox-picker" ref="panel" @keydown.esc.stop="closeFromKeyboard">
          <MailboxPanel compact :picker-open="open" @select="closeFromKeyboard" @dialog-open="open = false" />
        </section>
      </template>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useUiStore } from '@/store/ui.js'
import { useAccountStore } from '@/store/account.js'
import { useUserStore } from '@/store/user.js'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import MailboxPanel from '@/layout/account/index.vue'

defineProps({ compact: Boolean })

const uiStore = useUiStore()
const accountStore = useAccountStore()
const userStore = useUserStore()
const open = ref(false)
const trigger = ref(null)
const panel = ref(null)
let keyboardOpening = false
const currentAddress = computed(() => accountStore.currentAccount?.email || userStore.user?.email || '')

watch(() => uiStore.asideShow, () => {
  open.value = false
})

function rememberKeyboard(event) {
  if (!open.value && (event.key === 'Enter' || event.key === ' ')) keyboardOpening = true
}

function focusSelectedMailbox() {
  if (!keyboardOpening) return
  keyboardOpening = false
  const selected = panel.value?.querySelector('.account[aria-pressed="true"]')
  const fallback = panel.value?.querySelector('.head-opt button')
  const target = selected || fallback
  target?.focus()
}

function closeFromKeyboard() {
  if (!open.value) return
  open.value = false
  nextTick(() => trigger.value?.focus())
}
</script>

<style scoped>
.mailbox-switcher {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  margin: 8px 12px 12px;
}

.mailbox-switch-trigger {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) var(--rail-trailing-width);
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 6px 8px 6px 6px;
  padding-inline-end: var(--rail-trailing-inset);
  border: 1px solid var(--mac-line);
  border-radius: 10px;
  background: var(--mac-surface);
  color: var(--mac-text);
  text-align: start;
  cursor: pointer;
}

.mailbox-switch-trigger:hover {
  background: color-mix(in srgb, var(--mac-surface) 94%, var(--mac-text));
}

.mailbox-switch-trigger:focus-visible { outline: 2px solid var(--mac-focus); outline-offset: -2px; }

.mailbox-switch-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--mac-chrome);
  border: 1px solid var(--mac-line);
  color: var(--mac-text-2);
}

.mailbox-switch-label { display: grid; min-width: 0; }
.mailbox-switch-label strong { font-size: var(--mac-fs-chrome); line-height: var(--mac-lh-chrome); font-weight: 600; }
.mailbox-switch-label span {
  overflow: hidden;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-caption);
  line-height: var(--mac-lh-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mailbox-switch-trigger .disclosure-chevron { justify-self: center; width: 14px; height: 14px; color: var(--mac-text-2); }

/* 展开后与触发器连成一个整体：同底色、同边框，触发器底角与面板顶角变直 */
.mailbox-switcher :deep(.mailbox-switch-popover.el-popper) {
  width: calc(var(--mail-sidebar-width) - 24px);
  max-width: calc(100vw - 49px);
  padding: 4px 6px 6px;
  border: 1px solid var(--mac-line) !important;
  border-top: 0 !important;
  border-radius: 0 0 10px 10px;
  background: var(--mac-surface) !important;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: 0 10px 24px rgb(0 0 0 / 10%) !important;
  transform-origin: top center;
}
.mailbox-switcher:not(.is-compact) .mailbox-switch-trigger[aria-expanded='true'] {
  border-bottom-color: transparent;
  border-radius: 10px 10px 0 0;
  background: var(--mac-surface);
}
.mailbox-switcher:not(.is-compact) .mailbox-switch-trigger[aria-expanded='true']::after {
  position: absolute;
  inset: auto 10px -1px;
  height: 1px;
  background: var(--mac-line);
  content: '';
}
.mailbox-switch-trigger { position: relative; transition: background-color var(--mac-dur-1) ease, border-radius var(--mac-dur-1) ease; }
.mailbox-switch-trigger .disclosure-chevron { transition: transform var(--mac-dur-3) var(--mac-spring); }
.mailbox-switch-trigger[aria-expanded='true'] .disclosure-chevron { transform: rotate(90deg); }
/* 面板像卷帘一样从触发器下沿展开 */
.mailbox-switcher :deep(.mailbox-switch-popover.el-fade-in-linear-enter-active),
.mailbox-switcher :deep(.mailbox-switch-popover.el-fade-in-linear-leave-active) {
  transition: clip-path var(--mac-dur-3) var(--mac-ease), opacity var(--mac-dur-2) ease !important;
}
.mailbox-switcher:not(.is-compact) :deep(.mailbox-switch-popover.el-fade-in-linear-enter-from),
.mailbox-switcher:not(.is-compact) :deep(.mailbox-switch-popover.el-fade-in-linear-leave-to) {
  opacity: 0;
  clip-path: inset(0 0 100% 0 round 0 0 12px 12px);
}
.mailbox-switcher.is-compact :deep(.mailbox-switch-popover.el-popper) {
  width: 232px;
  border-top: 1px solid var(--mac-line) !important;
  border-radius: 10px;
  box-shadow: var(--mac-shadow-pop) !important;
}

.mailbox-switcher.is-compact { margin-inline: 12px; }
.is-compact .mailbox-switch-trigger {
  grid-template-columns: 1fr;
  justify-items: center;
  width: 36px;
  min-height: 36px;
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.is-compact .mailbox-switch-trigger:hover { background: var(--mac-hover); }
.is-compact .mailbox-switch-icon { width: 30px; height: 30px; }
.is-compact :is(.mailbox-switch-label, .disclosure-chevron) { display: none; }
</style>

<template>
  <div class="mailbox-switcher" :class="{ 'is-compact': compact }">
    <el-tooltip
      v-model:visible="open"
      trigger="click"
      role="dialog"
      :aria-label="$t('mailboxSwitcher')"
      :placement="compact ? 'right-start' : 'bottom-start'"
      :offset="compact ? 10 : 6"
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
  flex: 0 0 var(--mail-shell-header);
  display: flex;
  align-items: center;
  margin-inline: 12px;
}

.mailbox-switch-trigger {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) var(--rail-trailing-width);
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 5px 8px;
  padding-inline-end: calc(var(--rail-trailing-inset) - 1px);
  border: 1px solid transparent;
  border-radius: var(--mail-radius-card);
  background: var(--mail-shell-hover);
  color: var(--el-text-color-primary);
  text-align: start;
  cursor: pointer;
}

.mailbox-switch-trigger:hover,
.mailbox-switch-trigger[aria-expanded='true'] {
  background: var(--mail-shell-active);
}

.mailbox-switch-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--el-bg-color);
  border: 1px solid var(--mail-shell-line);
}

.mailbox-switch-label { display: grid; min-width: 0; line-height: 17px; }
.mailbox-switch-label strong { font-size: 13px; font-weight: 600; }
.mailbox-switch-label span {
  overflow: hidden;
  color: var(--mail-shell-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mailbox-switch-trigger .disclosure-chevron { justify-self: center; }

.mailbox-switcher :deep(.mailbox-switch-popover) {
  width: min(calc(var(--mail-sidebar-width) - 25px), calc(100vw - 49px));
  padding: 6px;
  border-color: var(--mail-shell-line);
  border-radius: var(--mail-radius-card);
  background: var(--mail-shell-sidebar);
  box-shadow: var(--el-box-shadow-light);
}

.mailbox-switcher.is-compact { margin-inline: 8px; }
.is-compact .mailbox-switch-trigger {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}
.is-compact :is(.mailbox-switch-label, .disclosure-chevron) { display: none; }
</style>

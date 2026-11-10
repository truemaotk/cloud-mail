<template>
  <div class="account-menu" :class="{ 'is-compact': compact }">
    <el-tooltip
      v-model:visible="open"
      trigger="click"
      role="dialog"
      :aria-label="$t('profileMenu')"
      :placement="compact ? 'right-end' : 'top-start'"
      :fallback-placements="[]"
      :offset="compact ? 10 : -1"
      :show-arrow="false"
      :teleported="false"
      :persistent="false"
      popper-class="mail-profile-popper"
      :popper-style="compact ? { width: '216px' } : triggerWidth ? { width: triggerWidth + 'px' } : undefined"
      effect="light"
      @show="focusPanelFromKeyboard"
    >
      <button
        ref="trigger"
        type="button"
        class="profile-trigger"
        :aria-label="$t('profileMenu')"
        :data-rail-label="compact ? $t('profileMenu') : undefined"
        :aria-expanded="open"
        :aria-controls="open ? 'sidebar-profile' : undefined"
        aria-haspopup="dialog"
        @keydown="markKeyboardOpening"
        @keydown.esc="closeFromKeyboard"
        @pointerdown="keyboardOpening = false"
      >
        <span class="profile-avatar" aria-hidden="true">{{ avatarInitial }}</span>
        <span class="profile-identity">
          <strong>{{ user.name || user.email }}</strong>
          <span :title="user.email">{{ user.email }}</span>
        </span>
        <NavigationIcon class="profile-chevron" name="chevron" :size="15" />
      </button>

      <template #content>
        <section id="sidebar-profile" class="profile-panel" @keydown.esc="closeFromKeyboard">
          <div class="profile-actions">
            <button ref="copyButton" type="button" class="profile-action profile-email"
                    :aria-label="$t('profileCopyEmail')" :title="user.email" @click="copyEmail">
              <NavigationIcon name="copy" :size="16" />
              <span>{{ user.email }}</span>
            </button>
            <RouterLink :to="{ name: 'setting' }" class="profile-action" @click="open = false">
              <NavigationIcon name="settings" :size="16" />
              {{ $t('settings') }}
            </RouterLink>
            <button type="button" class="profile-action" :disabled="logoutLoading" @click="clickLogout">
              <NavigationIcon name="logout" :size="16" />
              {{ $t('logOut') }}
            </button>
          </div>
        </section>
      </template>
    </el-tooltip>
  </div>
</template>


<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize } from '@vueuse/core'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import router from '@/router'
import { logout } from '@/request/login.js'
import { useUiStore } from '@/store/ui.js'
import { useUserStore } from '@/store/user.js'

defineProps({ compact: Boolean })

const { t } = useI18n()
const uiStore = useUiStore()
const userStore = useUserStore()
const user = computed(() => userStore.user)
const avatarInitial = computed(() => (Array.from(String(user.value?.name || user.value?.email || '?'))[0] || '?').toUpperCase())
const trigger = ref(null)
const { width: triggerWidth } = useElementSize(trigger, undefined, { box: 'border-box' })
const copyButton = ref(null)
const open = ref(false)
const logoutLoading = ref(false)
let keyboardOpening = false

watch(() => uiStore.asideShow, () => {
  open.value = false
})

function closeFromKeyboard(event) {
  if (!open.value) return
  event.stopPropagation()
  open.value = false
  trigger.value?.focus()
}

function markKeyboardOpening(event) {
  if (!open.value && (event.key === 'Enter' || event.key === ' ')) keyboardOpening = true
}

function focusPanelFromKeyboard() {
  if (keyboardOpening) copyButton.value?.focus()
  keyboardOpening = false
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(user.value.email)
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true })
  } catch (error) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true })
  }
}

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
    localStorage.removeItem('token')
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}
</script>

<style scoped>
.account-menu {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  margin: 8px 12px 12px;
}


.account-menu :deep(.mail-profile-popper.el-popper) {
  max-width: calc(100vw - 24px);
  padding: 0;
  border: 1px solid var(--mac-line) !important;
  border-bottom: 0 !important;
  border-radius: 10px 10px 0 0;
  background: var(--mac-surface) !important;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: 0 -10px 24px rgb(0 0 0 / 8%) !important;
}
.account-menu :deep(.mail-profile-popper.el-fade-in-linear-enter-active),
.account-menu :deep(.mail-profile-popper.el-fade-in-linear-leave-active) {
  transition: clip-path var(--mac-dur-3) var(--mac-ease), opacity var(--mac-dur-2) ease !important;
}
.account-menu:not(.is-compact) :deep(.mail-profile-popper.el-fade-in-linear-enter-from),
.account-menu:not(.is-compact) :deep(.mail-profile-popper.el-fade-in-linear-leave-to) {
  opacity: 0;
  clip-path: inset(100% 0 0 0 round 12px 12px 0 0);
}

.account-menu.is-compact { margin-inline: 12px; }
.is-compact :deep(.mail-profile-popper.el-popper) { border-bottom: 1px solid var(--mac-line) !important; border-radius: 10px; box-shadow: var(--mac-shadow-pop) !important; }
.is-compact .profile-trigger {
  grid-template-columns: 1fr;
  justify-items: center;
  width: 36px;
  min-height: 36px;
  padding: 0;
  border-color: transparent;
  background: transparent;
}
.is-compact .profile-trigger:hover { background: var(--mac-hover); }
.is-compact .profile-avatar { width: 28px; height: 28px; font-size: 12px; }
.is-compact :is(.profile-identity, .profile-chevron) { display: none; }

.profile-trigger {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--rail-trailing-width);
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
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease;
}

.profile-trigger { position: relative; transition: background-color var(--mac-dur-1) ease, border-radius var(--mac-dur-1) ease !important; }
.profile-trigger:hover { background: color-mix(in srgb, var(--mac-surface) 94%, var(--mac-text)); }
.account-menu:not(.is-compact) .profile-trigger[aria-expanded='true'] {
  border-top-color: transparent;
  background: var(--mac-surface);
}
.account-menu:not(.is-compact) .profile-trigger[aria-expanded='true']::after {
  position: absolute;
  inset: -1px 10px auto;
  height: 1px;
  background: var(--mac-line);
  content: '';
}

.account-menu:not(.is-compact) .profile-trigger[aria-expanded='true'] {
  border-radius: 0 0 10px 10px;
}

/* 账户头像：圆形首字母，与左上邮箱图标区分 */
.profile-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, #A1A1A6, #6E6E73);
  box-shadow: inset 0 0 0 .5px rgb(0 0 0 / 12%), inset 0 1px 0 rgb(255 255 255 / 22%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
}

.profile-identity {
  display: grid;
  min-width: 0;
  font-size: var(--mac-fs-caption);
  line-height: var(--mac-lh-caption);
}

.profile-identity strong,
.profile-identity span,
.profile-email span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-identity strong {
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-weight: 600;
}

.profile-identity span {
  color: var(--mac-text-2);
}

.profile-chevron {
  justify-self: center;
  width: 14px;
  height: 14px;
  color: var(--mac-text-2);
  transition: transform var(--mac-dur-3) var(--mac-spring);
}

.profile-trigger[aria-expanded='true'] .profile-chevron {
  transform: rotate(-90deg);
}

.profile-panel {
  max-height: calc(100dvh - 72px);
  overflow: auto;
  color: var(--el-text-color-primary);
}

.profile-actions {
  display: grid;
  gap: 2px;
  padding: 5px;
}

.profile-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 33px;
  padding: 5px 8px;
  border-radius: var(--mail-radius-control);
  color: var(--el-text-color-primary);
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  text-decoration: none;
}

.profile-action svg {
  flex-shrink: 0;
}

.profile-action.profile-email {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.profile-action { transition: background-color 80ms ease; }
.profile-action:hover:not(:disabled) {
  background: var(--mac-selected);
}

.profile-action:disabled {
  opacity: .6;
  cursor: wait;
}

.profile-trigger:focus-visible,
.profile-panel :is(button, a):focus-visible {
  outline: 2px solid var(--mac-focus);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .profile-trigger,
  .profile-chevron {
    transition: none;
  }
}
</style>

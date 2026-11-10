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
        <span class="profile-avatar"><NavigationIcon name="user" :size="18" /></span>
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


.account-menu :deep(.mail-profile-popper) {
  max-width: calc(100vw - 24px);
  padding: 0;
  border-color: var(--mac-line);
  border-radius: var(--mail-radius-card) var(--mail-radius-card) 0 0;
  background: var(--mac-surface);
  box-shadow: 0 -6px 16px rgb(0 0 0 / 8%);
}

.account-menu.is-compact { margin-inline: 12px; }
.is-compact :deep(.mail-profile-popper) { border-radius: var(--mail-radius-menu); background: var(--mac-chrome); box-shadow: var(--mac-shadow-pop); }
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
.is-compact .profile-avatar { width: 30px; height: 30px; }
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
  border-radius: var(--mail-radius-card);
  background: var(--mac-surface);
  color: var(--mac-text);
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease;
}

.profile-trigger:hover,
.profile-trigger[aria-expanded='true'] {
  background: var(--mac-hover);
}

.account-menu:not(.is-compact) .profile-trigger[aria-expanded='true'] {
  border-radius: 0 0 var(--mail-radius-card) var(--mail-radius-card);
}

.profile-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--mac-line);
  border-radius: 8px;
  background: var(--mac-chrome);
  color: var(--mac-text-2);
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
  transition: transform 150ms ease;
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

.profile-action:hover:not(:disabled) {
  background: var(--mac-hover);
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

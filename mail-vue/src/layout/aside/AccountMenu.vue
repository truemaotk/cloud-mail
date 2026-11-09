<template>
  <div class="account-menu">
    <el-tooltip
      v-model:visible="open"
      trigger="click"
      role="dialog"
      :aria-label="$t('profileMenu')"
      :placement="isNarrow ? 'top-start' : 'right-end'"
      :offset="0"
      :show-arrow="false"
      :persistent="false"
      popper-class="mail-profile-popper"
      :popper-style="isNarrow && triggerWidth ? { width: triggerWidth + 'px' } : undefined"
      effect="light"
      @show="focusPanelFromKeyboard"
    >
      <button
        ref="trigger"
        type="button"
        class="profile-trigger"
        :aria-label="$t('profileMenu')"
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
import { useElementSize, useMediaQuery } from '@vueuse/core'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import router from '@/router'
import { logout } from '@/request/login.js'
import { useUiStore } from '@/store/ui.js'
import { useUserStore } from '@/store/user.js'

const { t } = useI18n()
const uiStore = useUiStore()
const userStore = useUserStore()
const user = computed(() => userStore.user)
const isNarrow = useMediaQuery('(max-width: 560px)')
const trigger = ref(null)
const { width: triggerWidth } = useElementSize(trigger, undefined, { box: 'border-box' })
const copyButton = ref(null)
const open = ref(false)
const logoutLoading = ref(false)
let keyboardOpening = false

watch(() => uiStore.asideShow, (shown) => {
  if (!shown) open.value = false
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
  flex-shrink: 0;
  margin: 8px 12px 12px;
}

.profile-trigger {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 50px;
  padding: 7px 8px;
  border-radius: var(--mail-radius-card);
  background: var(--mail-shell-hover);
  color: var(--el-text-color-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease;
}

.profile-trigger:hover,
.profile-trigger[aria-expanded='true'] {
  background: var(--mail-shell-active);
}

.profile-trigger[aria-expanded='true'] {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}

.profile-avatar {
  display: grid;
  width: 33px;
  height: 33px;
  place-items: center;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-control);
  background: var(--el-bg-color);
}

.profile-identity {
  display: grid;
  gap: 1px;
  font-size: 12px;
  line-height: 1.35;
}

.profile-identity strong,
.profile-identity span,
.profile-email span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-identity strong {
  font-size: 13px;
  font-weight: 650;
}

.profile-identity span {
  color: var(--mail-shell-muted);
  font-size: 11.5px;
}

.profile-chevron {
  transition: transform 150ms ease;
}

@media (max-width: 560px) {
  .profile-trigger[aria-expanded='true'] {
    border-radius: 0 0 var(--mail-radius-card) var(--mail-radius-card);
  }

  .profile-trigger[aria-expanded='true'] .profile-chevron {
    transform: rotate(-90deg);
  }
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
  background: var(--el-fill-color);
}

.profile-action:disabled {
  opacity: .6;
  cursor: wait;
}

.profile-trigger:focus-visible,
.profile-panel :is(button, a):focus-visible {
  outline: 2px solid var(--el-text-color-secondary);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .profile-trigger,
  .profile-chevron {
    transition: none;
  }
}
</style>

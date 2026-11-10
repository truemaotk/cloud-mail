<template>
  <div class="sidebar" :class="{ 'is-compact': compact }"
       @pointerover="showRailHint" @pointerout="hideRailHintOnExit"
       @pointerdown.capture="clearRailHint" @click.capture="clearRailHint"
       @focusin="showRailHint" @focusout="hideRailHintOnExit" @keydown.esc="dismissRailHint">
    <MailboxSwitcher v-if="showMailboxes" :compact="compact" />
    <div v-else class="brand">
      <img class="brand-mark" src="/mail.svg" alt="" />
      <span>mail</span>
    </div>
    <button v-if="can('email:send')" class="compose-bar" type="button" :aria-label="$t('compose')"
            :data-rail-label="compact ? $t('compose') : undefined" @click="uiStore.writerRef.open()">
      <NavigationIcon name="compose" />
      <span>{{ $t('compose') }}</span>
    </button>

    <el-scrollbar class="navigation-scroll" @scroll="clearRailHint">
      <nav class="side-navigation" :class="{ 'nav-sorting': dragging }" :aria-label="$t('mailNavigation')"
           @pointerdown="begin" @click.capture="blockDragClick" @keydown="keyboardMove" @dragstart.prevent>
        <div class="mail-navigation-group">
          <RouterLink v-for="item in visibleMail" :key="item.name" :to="{ name: item.name }"
                      custom v-slot="{ href, navigate }">
            <a :href="href" class="nav-main"
               :class="itemClass(item.name)" data-nav-sort="mail" :data-nav-key="item.name"
               :data-rail-label="compact ? $t(item.label) : undefined" :aria-label="compact ? $t(item.label) : undefined"
               :aria-current="item.name === activeMenu ? 'page' : undefined" @click="followLink($event, navigate)">
              <NavigationIcon :name="item.icon" />
              <span class="nav-label">{{ $t(item.label) }}</span>
              <UnreadBadge v-if="item.name === 'email'" :count="inboxUnread" />
              <UnreadBadge v-if="item.name === 'draft'" :count="draftStore.count"
                           :label="$t('mailDraftCount', { count: draftStore.count })" />
            </a>
          </RouterLink>
        </div>
        <div class="utility-navigation-group">
        <template v-for="group in navigation" :key="group.key">
          <RouterLink v-if="group.route" :to="{ name: group.route }" custom v-slot="{ href, navigate }">
            <a :href="href" class="nav-main"
               :class="itemClass(group.key)" data-nav-sort="utility" :data-nav-key="group.key"
               :data-rail-label="compact ? $t(group.label) : undefined" :aria-label="compact ? $t(group.label) : undefined"
               :aria-current="group.route === activeMenu ? 'page' : undefined"
               @click="followLink($event, navigate)">
              <NavigationIcon :name="group.icon" />
              <span class="nav-label">{{ $t(group.label) }}</span>
            </a>
          </RouterLink>
          <div v-else class="nav-group">
            <button
              type="button"
              class="nav-group-toggle"
              :class="[itemClass(group.key), { 'has-current': group.items.some(item => item.route === activeMenu) }]"
              data-nav-sort="utility" :data-nav-key="group.key"
              :data-rail-label="compact ? $t(group.label) : undefined" :aria-label="compact ? $t(group.label) : undefined"
              :aria-expanded="openGroups[group.key]"
              :aria-controls="'mail-nav-' + group.key"
              @click="openGroups[group.key] = !openGroups[group.key]"
            >
              <NavigationIcon :name="group.icon" />
              <span class="nav-label">{{ $t(group.label) }}</span>
              <NavigationIcon v-if="!compact" class="nav-chevron" name="chevron" :size="15" />
            </button>
            <div
              :id="'mail-nav-' + group.key"
              class="nav-disclosure"
              :class="{ 'is-open': openGroups[group.key] }"
              :inert="!openGroups[group.key]"
            >
              <div class="nav-disclosure-body">
                <ul class="nav-children">
                  <li v-for="item in group.items" :key="item.route">
                    <RouterLink :to="{ name: item.route }" custom v-slot="{ href, navigate }">
                      <a
                        :href="href"
                        class="nav-child"
                        :class="itemClass(item.route)" :data-nav-sort="group.key" :data-nav-key="item.route"
                        :data-rail-label="compact ? $t(item.label) : undefined" :aria-label="compact ? $t(item.label) : undefined"
                        :aria-current="item.route === activeMenu ? 'page' : undefined"
                        @click="followLink($event, navigate)"
                      >
                        <NavigationIcon :name="item.icon" />
                        <span class="nav-label">{{ $t(item.label) }}</span>
                      </a>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
        </div>
      </nav>
    </el-scrollbar>

    <AccountMenu :compact="compact" />
    <span v-if="railHint" class="rail-hint" role="tooltip" :style="{ top: railHint.top + 'px' }">
      {{ railHint.label }}
    </span>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/store/ui.js'
import { useUserStore } from '@/store/user.js'
import { useEmailStore } from '@/store/email.js'
import { useSettingStore } from '@/store/setting.js'
import { useAccountStore } from '@/store/account.js'
import { userDraftStore } from '@/store/draft.js'
import { mailFolders } from '@/utils/mail-workspace.js'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import UnreadBadge from '@/components/unread-badge/index.vue'
import AccountMenu from './AccountMenu.vue'
import MailboxSwitcher from './MailboxSwitcher.vue'
import { useNavigationOrder } from './use-navigation-order.js'

const props = defineProps({ compact: Boolean })

const route = useRoute()
const uiStore = useUiStore()
const userStore = useUserStore()
const emailStore = useEmailStore()
const settingStore = useSettingStore()
const accountStore = useAccountStore()
const draftStore = userDraftStore()
const userId = computed(() => userStore.user?.userId)
const { ordered, begin, blockDragClick, keyboardMove, itemClass, dragging } = useNavigationOrder(uiStore, userId)
const railHint = ref(null)

function railTarget(element) {
  return element?.closest?.('[data-rail-label]')
}

function showRailHint(event) {
  if (!props.compact || dragging.value) return
  const target = railTarget(event.target)
  if (!target || target === railTarget(event.relatedTarget)) return
  if (event.type === 'pointerover' && (event.pointerType === 'touch' || event.buttons)) return
  if (event.type === 'focusin' && !target.matches(':focus-visible')) return
  if (target.matches('[aria-haspopup="dialog"][aria-expanded="true"]')) return

  const bounds = target.getBoundingClientRect()
  const rail = event.currentTarget.getBoundingClientRect()
  railHint.value = {
    label: target.dataset.railLabel,
    top: Math.min(rail.height - 18, Math.max(18, bounds.top + bounds.height / 2 - rail.top)),
  }
}

function clearRailHint() {
  railHint.value = null
}

function hideRailHintOnExit(event) {
  if (railTarget(event.target) !== railTarget(event.relatedTarget)) clearRailHint()
}

function dismissRailHint(event) {
  if (!railHint.value) return
  event.preventDefault()
  clearRailHint()
}

watch([() => props.compact, dragging], clearRailHint)
const mailEntries = [
  ...mailFolders,
  { name: 'all-email', label: 'allMail', icon: 'list', permission: 'all-email:query' },
]
const visibleMail = computed(() => ordered(mailEntries.filter(item => can(item.permission)), 'mail', item => item.name))
const inboxUnread = computed(() => accountStore.currentAccount?.allReceive
  ? emailStore.unreadTotal : emailStore.unreadByAccount[accountStore.currentAccountId])
const showMailboxes = computed(() => settingStore.settings.manyEmail === 0 && can('account:query'))

const entries = [
  { key: 'overview', route: 'analysis', label: 'analytics', icon: 'chart', permission: 'analysis:query' },
  {
    key: 'admin', label: 'navAdmin', icon: 'admin',
    items: [
      { route: 'user', label: 'allUsers', icon: 'user', permission: 'user:query' },
      { route: 'role', label: 'permissions', icon: 'shield', permission: 'role:query' },
      { route: 'reg-key', label: 'inviteCode', icon: 'key', permission: 'reg-key:query' },
    ],
  },
  {
    key: 'settings', label: 'navSettings', icon: 'settings',
    items: [
      { route: 'setting', label: 'settings', icon: 'user' },
      { route: 'sys-setting', label: 'SystemSettings', icon: 'screen', permission: 'setting:query' },
    ],
  },
]

function can(permission) {
  const permissions = userStore.user?.permKeys ?? []
  return !permission || permissions.includes('*') || permissions.includes(permission)
}

const navigation = computed(() => ordered(entries
  .map(entry => entry.items
    ? { ...entry, items: ordered(entry.items.filter(item => can(item.permission)), entry.key, item => item.route) }
    : entry)
  .filter(entry => entry.items ? entry.items.length > 0 : can(entry.permission)), 'utility', entry => entry.key))

const mailboxMenus = { ...Object.fromEntries(mailFolders.map(item => [item.path, item.name])), 'all-mail': 'all-email' }
const activeMenu = computed(() => route.meta.name === 'content' ? mailboxMenus[route.params.mailbox] : route.meta.name)
const openGroups = reactive({ admin: false, settings: false })

watch(activeMenu, (current) => {
  const group = entries.find(entry => entry.items?.some(item => item.route === current))
  if (group) openGroups[group.key] = true
}, { immediate: true })

function followLink(event, navigate) {
  navigate(event)
  if (window.innerWidth <= 1024 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    uiStore.asideShow = false
  }
}
</script>

<style scoped>
.sidebar {
  --rail-trailing-width: 30px;
  --rail-trailing-inset: 3px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--mail-shell-sidebar);
}

.brand {
  display: flex;
  align-items: center;
  flex: 0 0 var(--mail-shell-header);
  gap: 9px;
  padding: 0 16px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -.025em;
}

.brand > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-mark {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
}

.compose-bar svg {
  width: 18px;
  height: 18px;
}

.compose-bar {
  display: flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-height: 39px;
  margin: 4px 12px 16px;
  padding: 7px 16px;
  max-width: calc(100% - 24px);
  overflow: hidden;
  white-space: nowrap;
  border-radius: var(--mail-radius-control);
  background: var(--mail-shell-action);
  color: var(--mail-shell-action-text);
  cursor: pointer;
  font-weight: 600;
}

.compose-bar:hover {
  background: var(--mail-shell-action-hover);
}

.navigation-scroll {
  flex: 1 1 0;
  min-height: 0;
}

.side-navigation {
  padding: 0 12px 12px;
  user-select: none;
}

.mail-navigation-group,
.utility-navigation-group {
  display: grid;
  gap: 2px;
}

.utility-navigation-group {
  margin-block-start: 10px;
  padding-block-start: 10px;
  border-block-start: 1px solid var(--mail-shell-line);
}

.nav-main,
.nav-group-toggle,
.nav-child {
  position: relative;
  display: grid;
  align-items: center;
  grid-template-columns: 18px minmax(0, 1fr) 11px;
  gap: 9px;
  width: 100%;
  min-height: 36px;
  padding: 5px 10px;
  border-radius: var(--mail-radius-control);
  color: var(--mail-shell-muted);
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.nav-main,
.nav-group-toggle {
  grid-template-columns: 18px minmax(0, 1fr) var(--rail-trailing-width);
  padding-inline-end: var(--rail-trailing-inset);
}

.nav-main > svg,
.nav-group-toggle svg {
  width: 18px;
  height: 18px;
}

.nav-group-toggle .nav-chevron,
.nav-main :deep(.unread-badge) {
  grid-column: 3;
  justify-self: center;
}

.nav-group-toggle .nav-chevron {
  width: 15px;
  height: 15px;
  transition: transform 150ms ease;
}

.nav-group-toggle[aria-expanded='true'] .nav-chevron {
  transform: rotate(90deg);
}

.nav-main:hover,
.nav-group-toggle:hover,
.nav-child:hover {
  color: var(--el-text-color-primary);
  background: var(--mail-shell-hover);
}

.nav-main[aria-current='page'],
.nav-group-toggle.has-current,
.nav-child[aria-current='page'] {
  color: var(--el-text-color-primary);
}

.nav-main[aria-current='page'],
.nav-child[aria-current='page'],
.nav-group-toggle.has-current[aria-expanded='false'] {
  background: var(--mail-shell-active);
}

.nav-main[aria-current='page']::before,
.nav-child[aria-current='page']::before,
.nav-group-toggle.has-current[aria-expanded='false']::before {
  position: absolute;
  inset: 8px auto 8px 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--mail-shell-marker);
  content: '';
}

.nav-disclosure {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 180ms ease, opacity 150ms ease;
}

.nav-disclosure.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.nav-disclosure-body {
  min-height: 0;
  overflow: hidden;
}

.nav-children {
  display: grid;
  gap: 2px;
  margin: 3px 0 2px 17px;
  padding-left: 7px;
  border-left: 1px solid var(--mail-shell-line);
  list-style: none;
}

.nav-child {
  grid-template-columns: 16px minmax(0, 1fr) auto;
  min-height: 33px;
}

.nav-child svg {
  width: 16px;
  height: 16px;
}

.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-sorting :is(.nav-main, .nav-child, .nav-group-toggle) { cursor: grabbing; }
.nav-sort-held { opacity: .55; }
:is(.nav-sort-before, .nav-sort-after)::after {
  position: absolute;
  inset-inline: 5px;
  height: 2px;
  z-index: 1;
  border-radius: 1px;
  background: var(--mail-shell-marker);
  pointer-events: none;
  content: '';
}
.nav-sort-before::after { top: -1px; }
.nav-sort-after::after { bottom: -1px; }

.is-compact .brand {
  justify-content: center;
  padding-inline: 0;
}
.is-compact .brand > span,
.is-compact .compose-bar > span,
.is-compact .nav-label { display: none; }
.is-compact .compose-bar {
  align-self: center;
  width: 42px;
  min-height: 40px;
  max-width: none;
  margin-inline: 0;
  padding: 0;
}
.is-compact .side-navigation { padding-inline: 8px; }
.is-compact .nav-children { margin: 2px 0; padding: 0; border: 0; }
.is-compact :is(.nav-main, .nav-group-toggle, .nav-child) {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}
.is-compact .nav-group-toggle[aria-expanded='true'] {
  color: var(--el-text-color-primary);
  background: var(--mail-shell-hover);
}
.is-compact .nav-main :deep(.unread-badge) {
  position: absolute;
  grid-column: auto;
  inset-block-start: 0;
  inset-inline-end: 0;
  transform: scale(.78);
  transform-origin: top right;
}

.rail-hint {
  position: absolute;
  z-index: 3;
  inset-inline-start: calc(100% + 8px);
  transform: translateY(-50%);
  width: max-content;
  max-width: calc(100vw - 88px);
  padding: 6px 10px;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-control);
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  box-shadow: var(--el-box-shadow-light);
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.rail-hint::before {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: -4px;
  width: 6px;
  height: 6px;
  transform: translateY(-50%) rotate(45deg);
  border-inline-start: 1px solid var(--mail-shell-line);
  border-block-end: 1px solid var(--mail-shell-line);
  background: inherit;
  content: '';
}

.compose-bar:focus-visible,
.nav-main:focus-visible,
.nav-group-toggle:focus-visible,
.nav-child:focus-visible {
  outline: 2px solid var(--mail-shell-muted);
  outline-offset: -2px;
}

@media (max-width: 767px) {
  .compose-bar {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-group-toggle .nav-chevron,
  .nav-main,
  .nav-group-toggle,
  .nav-child,
  .nav-disclosure {
    transition: none;
  }
}
</style>

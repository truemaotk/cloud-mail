<template>
  <div class="sidebar">
    <div class="brand">
      <img class="brand-mark" src="/mail.svg" alt="" />
      <span>mail</span>
    </div>
    <button v-if="can('email:send')" class="compose-bar" type="button" @click="uiStore.writerRef.open()">
      <NavigationIcon name="compose" />
      <span>{{ $t('compose') }}</span>
    </button>

    <el-scrollbar class="navigation-scroll">
      <nav class="side-navigation" :aria-label="$t('mailNavigation')">
        <template v-for="group in navigation" :key="group.key">
          <RouterLink v-if="group.route" :to="{ name: group.route }" custom v-slot="{ href, navigate }">
            <a :href="href" class="nav-main"
               :aria-current="group.route === activeMenu ? 'page' : undefined"
               @click="followLink($event, navigate)">
              <NavigationIcon :name="group.icon" />
              <span>{{ $t(group.label) }}</span>
            </a>
          </RouterLink>
          <div v-else class="nav-group">
            <button
              type="button"
              class="nav-group-toggle"
              :class="{ 'has-current': group.items.some(item => item.route === activeMenu) }"
              :aria-expanded="openGroups[group.key]"
              :aria-controls="'mail-nav-' + group.key"
              @click="openGroups[group.key] = !openGroups[group.key]"
            >
              <NavigationIcon :name="group.icon" />
              <span>{{ $t(group.label) }}</span>
              <UnreadBadge v-if="group.key === 'mail' && !openGroups.mail" :count="emailStore.unreadTotal" />
              <NavigationIcon class="nav-chevron" name="chevron" :size="15" />
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
                        :aria-current="item.route === activeMenu ? 'page' : undefined"
                        @click="followLink($event, navigate)"
                      >
                        <NavigationIcon :name="item.icon" />
                        <span>{{ $t(item.label) }}</span>
                        <UnreadBadge v-if="item.route === 'email'" :count="emailStore.unreadTotal" />
                      </a>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </nav>
    </el-scrollbar>

    <AccountMenu />
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/store/ui.js'
import { useUserStore } from '@/store/user.js'
import { useEmailStore } from '@/store/email.js'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import UnreadBadge from '@/components/unread-badge/index.vue'
import AccountMenu from './AccountMenu.vue'

const route = useRoute()
const uiStore = useUiStore()
const userStore = useUserStore()
const emailStore = useEmailStore()

const entries = [
  {
    key: 'mail', label: 'navMailbox', icon: 'mail',
    items: [
      { route: 'email', label: 'inbox', icon: 'inbox' },
      { route: 'send', label: 'sent', icon: 'send', permission: 'email:send' },
      { route: 'draft', label: 'drafts', icon: 'draft', permission: 'email:send' },
      { route: 'star', label: 'starred', icon: 'star' },
    ],
  },
  { key: 'overview', route: 'analysis', label: 'analytics', icon: 'chart', permission: 'analysis:query' },
  {
    key: 'admin', label: 'navAdmin', icon: 'admin',
    items: [
      { route: 'all-email', label: 'allMail', icon: 'list', permission: 'all-email:query' },
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

const navigation = computed(() => entries
  .map(entry => entry.items ? { ...entry, items: entry.items.filter(item => can(item.permission)) } : entry)
  .filter(entry => entry.items ? entry.items.length > 0 : can(entry.permission)))

const mailboxMenus = { inbox: 'email', sent: 'send', starred: 'star', 'all-mail': 'all-email' }
const activeMenu = computed(() => route.meta.name === 'content' ? mailboxMenus[route.params.mailbox] : route.meta.name)
const openGroups = reactive({ mail: false, admin: false, settings: false })

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
  display: flex;
  flex-direction: column;
  width: min(calc(var(--mail-sidebar-width) - 1px), calc(100vw - 24px));
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
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-height: 39px;
  margin: 4px 12px 16px;
  padding: 7px 12px;
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
  display: grid;
  gap: 6px;
  padding: 0 12px 12px;
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
  padding: 5px 9px;
  border-radius: var(--mail-radius-control);
  color: var(--mail-shell-muted);
  font-size: 13px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.nav-main {
  grid-template-columns: 18px minmax(0, 1fr) auto;
}

.nav-main > svg,
.nav-group-toggle svg {
  width: 18px;
  height: 18px;
}

.nav-group-toggle {
  grid-template-columns: 18px minmax(0, 1fr) auto 15px;
}

.nav-group-toggle .nav-chevron {
  grid-column: 4;
  width: 15px;
  height: 15px;
  justify-self: center;
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

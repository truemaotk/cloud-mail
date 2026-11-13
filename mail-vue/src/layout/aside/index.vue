<template>
  <div class="sidebar" :class="{ 'is-compact': compact }">
    <div class="mobile-bar">
      <span class="mobile-bar-title">Mail</span>
      <ToolbarButton icon="close" :label="$t('toggleMailNavigation')" @click="uiStore.asideShow = false" />
    </div>
    <MailboxSwitcher v-if="showMailboxes" :compact="compact" />
    <div v-else class="brand">
      <img class="brand-mark" src="/mail.svg" alt="" />
      <span>Mail</span>
    </div>
    <button v-if="can('email:send')" class="compose-bar mail-compose-trigger" type="button" :aria-label="$t('compose')"
            :data-rail-label="compact ? $t('compose') : undefined" @click="openComposer">
      <NavigationIcon name="compose" :size="20" />
      <span>{{ $t('compose') }}</span>
    </button>

    <el-scrollbar class="navigation-scroll">
      <nav class="side-navigation" :class="{ 'nav-sorting': dragging }" :aria-label="$t('mailNavigation')"
           @pointerdown="begin" @touchstart.passive="beginTouch" @contextmenu="preventHoldMenu"
           @click.capture="blockDragClick" @keydown="keyboardMove" @dragstart.prevent>
        <TransitionGroup name="nav-order" tag="div" class="mail-navigation-group">
          <RouterLink v-for="item in visibleMail" :key="item.name" :to="{ name: item.name }"
                      custom v-slot="{ href, navigate }">
            <a :href="href" class="nav-main"
               :class="itemClass(item.name)" data-nav-sort="mail" :data-nav-key="item.name"
               :data-rail-label="compact ? $t(item.label) : undefined"
               :aria-label="compact ? $t(item.label) : undefined"
               :aria-description="compact && unreadFor(item.name) ? $t('unreadMessages', { count: unreadFor(item.name) }) : undefined"
               :aria-current="item.name === activeMenu && !(item.name === 'email' && activeLabelId) ? 'page' : undefined" @click="followLink($event, navigate)">
              <NavigationIcon :name="item.icon" />
              <span class="nav-label">{{ $t(item.label) }}</span>
              <UnreadBadge v-if="item.name === 'email' || item.name === 'all-email'" :count="unreadFor(item.name)"
                           :arrival="arrivalFor(item.name)" />
              <UnreadBadge v-if="item.name === 'draft'" :count="draftStore.count"
                           :label="$t('mailDraftCount', { count: draftStore.count })" />
            </a>
          </RouterLink>
        <section key="label-group" class="nav-group" :aria-label="$t('mailLabels')">
          <button v-if="compact" class="nav-main label-nav-compact" type="button" :aria-label="$t('mailLabels')"
                  :data-rail-label="$t('mailLabels')" :aria-current="activeLabelId ? 'page' : undefined" @click="openLabels()">
            <NavigationIcon name="tag" />
          </button>
          <template v-else>
            <button class="nav-group-toggle" type="button" :class="{ 'has-current': activeLabelId }"
                    :aria-expanded="labelsOpen" aria-controls="mail-nav-labels" @click="labelsOpen = !labelsOpen">
              <NavigationIcon name="tag" />
              <span class="nav-label">{{ $t('mailLabels') }}</span>
              <NavigationIcon class="nav-chevron" name="chevron" :size="15" />
            </button>
            <div id="mail-nav-labels" class="nav-disclosure" :class="{ 'is-open': labelsOpen }" :inert="!labelsOpen">
              <div class="nav-disclosure-body">
                <ul class="nav-children">
                  <li>
                    <button class="nav-child" type="button" @click="openLabels()">
                      <NavigationIcon name="settings" />
                      <span class="nav-label">{{ $t('mailManageLabels') }}</span>
                    </button>
                  </li>
                  <li v-for="label in labelStore.messageLabels" :key="label.id" class="label-navigation-row">
                    <RouterLink :to="{ name: 'email', query: { label: label.id } }" custom v-slot="{ href, navigate }">
                      <a :href="href" class="nav-child label-nav-link" :style="{ '--tag-color': labelColors[label.color] }"
                         :aria-current="activeLabelId === label.id ? 'page' : undefined" @click="followLink($event, navigate)">
                        <NavigationIcon name="tag" />
                        <span class="nav-label">{{ label.name }}</span>
                      </a>
                    </RouterLink>
                    <ToolbarButton class="label-nav-edit" icon="more" :label="$t('mailEditLabelNamed', { name: label.name })"
                                   @click="openLabels(label)" />
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </section>
        </TransitionGroup>
        <TransitionGroup name="nav-order" tag="div" class="utility-navigation-group">
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
              <NavigationIcon class="nav-chevron" name="chevron" :size="15" />
            </button>
            <div
              :id="'mail-nav-' + group.key"
              class="nav-disclosure"
              :class="{ 'is-open': openGroups[group.key] }"
              :inert="!openGroups[group.key]"
            >
              <div class="nav-disclosure-body">
                <TransitionGroup name="nav-order" tag="ul" class="nav-children">
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
                </TransitionGroup>
              </div>
            </div>
          </div>
        </template>
        </TransitionGroup>
      </nav>
    </el-scrollbar>

    <span v-if="dragging" class="nav-sort-status" role="status">{{ $t('navSortingHint') }}</span>

    <AccountMenu :compact="compact" />
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
import { labelColors, useLabelsStore } from '@/store/labels.js'
import { userDraftStore } from '@/store/draft.js'
import { mailFolders } from '@/utils/mail-workspace.js'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import UnreadBadge from '@/components/unread-badge/index.vue'
import ToolbarButton from '@/components/toolbar-button/index.vue'
import AccountMenu from './AccountMenu.vue'
import MailboxSwitcher from './MailboxSwitcher.vue'
import { useNavigationOrder } from './use-navigation-order.js'

const props = defineProps({ compact: Boolean })

const route = useRoute()
const uiStore = useUiStore()
function openComposer(event) {
  if (window.innerWidth < 1025) uiStore.asideShow = false
  uiStore.writerRef.open(event.currentTarget)
}
const userStore = useUserStore()
const emailStore = useEmailStore()
const settingStore = useSettingStore()
const accountStore = useAccountStore()
const draftStore = userDraftStore()
const userId = computed(() => userStore.user?.userId)
const labelStore = useLabelsStore()
const activeLabelId = computed(() => activeMenu.value === 'email' ? Number(route.query.label) : 0)
const labelsOpen = ref(false)
watch(userId, id => { labelStore.load(id ?? null).catch(() => {}) }, { immediate: true })
function openLabels(label) {
  if (window.innerWidth < 1025) uiStore.asideShow = false
  if (label) labelStore.edit('message', label)
  else labelStore.manage('message')
}
const { ordered, begin, beginTouch, preventHoldMenu, blockDragClick, keyboardMove, itemClass, dragging } = useNavigationOrder(uiStore, userId)
const mailEntries = [
  ...mailFolders,
  { name: 'all-email', label: 'allMail', icon: 'list', permission: 'all-email:query' },
]
const visibleMail = computed(() => ordered(mailEntries.filter(item => can(item.permission)), 'mail', item => item.name))
const inboxUnread = computed(() => accountStore.currentAccount?.allReceive
  ? emailStore.unreadTotal : emailStore.unreadByAccount[accountStore.currentAccountId])

function unreadFor(name) {
  if (name === 'all-email') return emailStore.allUnreadTotal
  return name === 'email' ? inboxUnread.value : 0
}

function arrivalFor(name) {
  const arrival = emailStore.newMail
  if (name === 'all-email') return arrival?.id
  if (arrival && (accountStore.currentAccount?.allReceive ? arrival.inboxes.length
    : arrival.inboxes.includes(accountStore.currentAccountId))) return arrival.id
}

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
  { key: 'help', route: 'help', label: 'help', icon: 'headset' },
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
  --rail-trailing-inset: 2px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: var(--r-sheet);
  transition: border-radius var(--mac-slide-duration) var(--mac-slide-ease);
  isolation: isolate;
  box-shadow: 0 2px 6px rgb(0 0 0 / 5%), 0 10px 28px rgb(0 0 0 / 9%);
}
.sidebar.is-compact { border-radius: 16px; }

/* The material and its single inner edge share the parent's exact curve.
   A circular clip-path over a superellipse produces doubled, dirty corners.
   Keep clipping off the parent so nested menus can extend beyond the rail. */
.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  corner-shape: inherit;
  background: linear-gradient(160deg, color-mix(in srgb, var(--mac-surface) 64%, var(--mac-sidebar)), color-mix(in srgb, var(--mac-surface) 46%, var(--glass-sidebar)));
  box-shadow: inset 0 0 0 1px var(--mac-line-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .sidebar::before { background: var(--mac-sidebar); }
}

.mobile-bar { display: none; }
@media (max-width: 1024px) {
  .mobile-bar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 0 18px;
  }
  .mobile-bar-title { font-size: var(--mac-fs-title); line-height: var(--mac-lh-title); font-weight: 600; }
}

.brand {
  display: flex;
  align-items: center;
  flex: 0 0 var(--mail-shell-header);
  gap: 8px;
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
  width: 28px;
  height: 28px;
}

.compose-bar svg {
  width: 16px;
  height: 16px;
}

.compose-bar {
  display: grid;
  align-items: center;
  grid-template-columns: 36px minmax(0, 1fr);
  justify-content: start;
  flex-shrink: 0;
  gap: 0;
  height: 38px;
  margin: 0 12px 12px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  cursor: pointer;
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-weight: 600;
  text-align: left;
}
.compose-bar > svg { justify-self: center; }

.compose-bar { transition: width var(--mac-slide-duration) var(--mac-slide-ease); }

.navigation-scroll {
  flex: 1 1 0;
  min-height: 0;
}

.label-nav-edit { width: 28px; height: 28px; flex-basis: 28px; }
.label-navigation-row { position: relative; }
.label-navigation-row .label-nav-link { padding-inline-end: 30px; }
.label-navigation-row .label-nav-link > svg { color: var(--tag-color); }
.label-navigation-row .label-nav-edit { position: absolute; inset: 50% 2px auto auto; translate: 0 -50%; }
.label-nav-edit > :deep(.toolbar-button-surface) { display: none; }
@media (hover: hover) and (pointer: fine) {
  .label-nav-edit { opacity: 0; }
  .label-navigation-row:is(:hover, :focus-within) .label-nav-edit { opacity: 1; }
}

.side-navigation {
  padding: 0 12px 12px;
  user-select: none;
}

.mail-navigation-group,
.utility-navigation-group {
  position: relative;
  display: grid;
  gap: 2px;
}
.utility-navigation-group {
  margin-block-start: 8px;
  padding-block-start: 8px;
  border-block-start: 0;
}
.utility-navigation-group::before {
  content: '';
  position: absolute;
  top: 0;
  left: 6px;
  right: 6px;
  height: 1px;
  background: var(--mac-line-strong);
}

.nav-main,
.nav-group-toggle,
.nav-child {
  position: relative;
  display: grid;
  align-items: center;
  grid-template-columns: 18px minmax(0, 1fr) 11px;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 4px 8px;
  border-radius: var(--r-item);
  color: var(--mac-text);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--mac-dur-1) ease, color var(--mac-dur-1) ease, transform var(--mac-dur-1) var(--mac-ease);
}

.nav-main:active, .nav-group-toggle:active, .nav-child:active { background: var(--mac-press); }
.nav-group { min-width: 0; }

.nav-main,
.nav-group-toggle {
  grid-template-columns: 18px minmax(0, 1fr) var(--rail-trailing-width);
  padding-inline: 10px var(--rail-trailing-inset);
}

.nav-main > svg,
.nav-group-toggle > svg:first-child,
.nav-child > svg {
  width: 17px;
  height: 17px;
  justify-self: center;
  color: var(--mac-text-2);
  transition: color var(--mac-dur-1) ease;
}

.nav-group-toggle .nav-chevron,
.nav-main :deep(.unread-badge) {
  grid-column: 3;
  justify-self: center;
}

.nav-group-toggle .nav-chevron {
  width: 14px;
  height: 14px;
  color: var(--mac-text-3);
  transition: transform var(--mac-dur-3) var(--mac-spring);
}

.nav-group-toggle[aria-expanded='true'] .nav-chevron {
  transform: rotate(90deg);
}

.nav-main:hover,
.nav-group-toggle:hover,
.nav-child:hover {
  background: var(--mac-hover);
}

/* 选中：灰底 + 文字加粗，图标转为主色 */
.nav-main[aria-current='page'],
.nav-child[aria-current='page'],
.nav-group-toggle.has-current[aria-expanded='false'] {
  background: var(--mac-selected);
  color: var(--mac-text);
}

.nav-main[aria-current='page'] .nav-label,
.nav-child[aria-current='page'] .nav-label,
.nav-group-toggle.has-current .nav-label { font-weight: 600; }

.nav-main[aria-current='page'] > svg,
.nav-child[aria-current='page'] > svg,
.nav-group-toggle.has-current > svg:first-child {
  color: var(--mac-accent-ink);
}

/* 展开收起：高度与透明度一起流动 */
.nav-disclosure {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows var(--mac-slide-duration) var(--mac-slide-ease), opacity var(--mac-slide-duration) ease;
}

.nav-disclosure.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.nav-disclosure-body {
  min-height: 0;
  overflow: hidden;
  transform: translateY(-6px);
  transition: transform var(--mac-slide-duration) var(--mac-slide-ease);
}
.nav-disclosure.is-open .nav-disclosure-body { transform: translateY(0); }

/* 二级菜单：目录树。竖线与父级图标中心对齐，选中项在竖线上加粗一段 */
.nav-children {
  position: relative;
  display: grid;
  gap: 2px;
  margin: 2px 0 4px 19px;
  padding-left: 12px;
  list-style: none;
}
.nav-children > li { min-width: 0; }

.nav-children::before {
  position: absolute;
  inset-block: 4px;
  inset-inline-start: 0;
  width: 2px;
  transform: translateX(-50%);
  background: var(--mac-line-strong);
  content: '';
}

.nav-child {
  grid-template-columns: 16px minmax(0, 1fr) auto;
  min-height: 30px;
}

.nav-child::before {
  position: absolute;
  inset-block: 7px;
  inset-inline-start: -12px;
  width: 4px;
  border-radius: 2px;
  background: var(--mac-accent-ink);
  content: '';
  opacity: 0;
  transform: translateX(-50%) scaleY(.3);
  transition: opacity var(--mac-dur-2) ease, transform var(--mac-dur-3) var(--mac-spring);
}

.nav-child[aria-current='page']::before {
  opacity: 1;
  transform: translateX(-50%);
}

.nav-child > svg {
  width: 16px;
  height: 16px;
}

.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-sorting :is(.nav-main, .nav-child, .nav-group-toggle) { cursor: grabbing; }
.nav-sort-held { opacity: .8; box-shadow: inset 0 0 0 1px var(--mac-accent-ink) !important; }
.nav-order-move { transition: transform var(--mac-slide-duration) var(--mac-slide-ease) !important; }
.side-navigation a { -webkit-touch-callout: none; }
.nav-sort-status {
  position: absolute;
  bottom: 66px;
  left: 12px;
  z-index: 5;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--glass-bg-solid);
  box-shadow: var(--mac-shadow-pop);
  white-space: nowrap;
  font-size: var(--mac-fs-caption);
  pointer-events: none;
}
:is(.nav-sort-before, .nav-sort-after)::after {
  position: absolute;
  inset-inline: 5px;
  height: 2px;
  z-index: 1;
  border-radius: 1px;
  background: var(--mac-text);
  pointer-events: none;
  content: '';
}
.nav-sort-before::after { top: -1px; }
.nav-sort-after::after { bottom: -1px; }

.is-compact .brand {
  justify-content: center;
  padding-inline: 0;
}
.is-compact .brand > span { display: none; }
/* 折叠时图标位置不变，只让文字淡出，宽度随侧栏一起流动 */
.nav-label { transition: opacity var(--mac-dur-2) ease; }
.is-compact .nav-label { opacity: 0; }
.is-compact .compose-bar {
  align-self: center;
  width: 36px;
  height: 36px;
  margin-inline: 0;
  padding: 0;
}
.is-compact .side-navigation { padding-inline: 12px; }
.is-compact .utility-navigation-group { margin-inline: 0; }
.is-compact .nav-children { margin: 2px 0; padding: 0; border: 0; }
.is-compact .nav-children::before, .is-compact .nav-child::before { display: none; }
.is-compact :is(.nav-main, .nav-group-toggle, .nav-child) {
  width: 100%;
  min-height: 36px;
  overflow: hidden;
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 0;
  padding: 0;
}
@media (min-width: 1025px) {
  /* Keep the vertical rhythm fixed. Expanded controls retain their own
     hierarchy; horizontal indentation eases into the compact icon rail. */
  .compose-bar {
    height: 36px;
    width: min(calc((var(--mail-sidebar-width) - 24px) / 2), calc(100% - 24px));
    padding: 0;
  }
  .compose-bar > svg { flex: 0 0 20px; width: 20px; height: 20px; }
  .compose-bar > span { overflow: hidden; text-overflow: ellipsis; transition: opacity var(--mac-dur-2) ease; }
  .is-compact .compose-bar > span { opacity: 0; }
  .is-compact .compose-bar { align-self: auto; margin-inline: 12px; gap: 0; }
  .nav-main, .nav-group-toggle, .nav-child { height: 36px; min-height: 36px; }
  :is(.nav-main, .nav-group-toggle, .nav-child),
  .is-compact :is(.nav-main, .nav-group-toggle, .nav-child) {
    grid-template-columns: 18px minmax(0, 1fr) var(--rail-trailing-width);
    padding-inline: 9px var(--rail-trailing-inset);
    gap: 8px;
    justify-items: stretch;
  }
  .nav-children {
    margin: 2px 0 4px 18px;
    padding-left: 10px;
    transition: margin-left var(--mac-slide-duration) var(--mac-slide-ease), padding-left var(--mac-slide-duration) var(--mac-slide-ease);
  }
  .is-compact .nav-children { margin: 2px 0 4px; padding: 0; }
  .nav-child::before { inset-inline-start: -10px; }
}
.is-compact .nav-label, .is-compact .nav-chevron { opacity: 0; pointer-events: none; }
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

.compose-bar:focus-visible,
.nav-main:focus-visible,
.nav-group-toggle:focus-visible,
.nav-child:focus-visible {
  outline: 2px solid var(--mac-focus);
  outline-offset: -2px;
}

@media (max-width: 1024px) {
  .nav-main, .nav-group-toggle { min-height: 40px; }
  .nav-child { min-height: 40px; }
  .compose-bar { height: 40px; width: calc((100% - 24px) / 2); }
  .mobile-bar :deep(.toolbar-button) { width: 40px; height: 40px; }
  .compose-bar > svg { width: 18px; height: 18px; }
  .nav-main > svg, .nav-group-toggle > svg:first-child { width: 18px; height: 18px; }
}


</style>

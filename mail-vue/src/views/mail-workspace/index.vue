<template>
  <section ref="workspace" class="mail-workspace"
           :class="{ 'has-message': messageId, 'wide-reading': uiStore.wideReading, 'split-reading': !uiStore.wideReading }"
           :style="{ '--list-width': listWidth ? listWidth + 'px' : undefined }">
    <section class="message-list-pane" :aria-label="$t('mailReadingList')">
      <div class="message-list-toolbar">
        <el-checkbox v-model="allSelected" :indeterminate="!!selected.length && !allSelected"
                     :disabled="!rows.length" :aria-label="$t('selectAllMail')" />
        <span v-if="selected.length" class="list-range">{{ $t('mailSelected', { count: selected.length }) }}</span>
        <span v-else class="list-range" aria-live="polite">{{ range }}</span>
        <ToolbarButton v-if="selected.length && isDraft" icon="delete" :label="$t('mailDiscardDraft')"
                       @click="discardDrafts" />
        <ToolbarButton v-else-if="selected.length && isAdmin && canDeleteAdmin" icon="delete"
                       :label="$t('mailPurge')" :busy="deleting" @click="deleteAdmin(selected)" />
        <MessageActions v-else-if="selected.length && !isAdmin" class="list-bulk-actions" :folder="folder" :ids="selected"
                        :can-file="selectionCanFile"
                        @change="handleAction" />
        <template v-else-if="!selected.length">
          <span class="toolbar-group">
          <ToolbarButton icon="chevron" class="page-back" :label="$t('mailPreviousPage')"
                         :disabled="offset === 0" @click="changePage(-1)" />
          <ToolbarButton icon="chevron" :label="$t('mailNextPage')"
                         :disabled="offset + pageSize >= total" @click="changePage(1)" />
          </span>
          <span class="toolbar-group">
          <el-dropdown v-if="isAdmin" trigger="click" placement="bottom-end" :show-arrow="false"
                       @command="handleAdminFilter">
            <ToolbarButton icon="filter" :label="$t('mailFilter')" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="(label, value) in adminTypes" :key="value" :command="value">
                  <NavigationIcon :name="value === adminType ? 'mail-delivered' : 'mail'" :size="15" />
                  {{ $t(label) }}
                </el-dropdown-item>
                <el-dropdown-item command="sort" divided>
                  <NavigationIcon :name="adminSort ? 'sort-old' : 'sort-new'" :size="15" />
                  {{ $t(adminSort ? 'sortOldest' : 'sortNewest') }}
                </el-dropdown-item>
                <el-dropdown-item v-if="canDeleteAdmin" command="cleanup">
                  <NavigationIcon name="clear" :size="15" />{{ $t('clearEmail') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown v-else-if="!isDraft" trigger="click" placement="bottom-end" :show-arrow="false"
                       @command="setUnreadOnly">
            <ToolbarButton icon="filter" :label="$t('mailFilter')" :aria-pressed="unreadOnly" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :command="false">{{ $t('mailFilterAll') }}</el-dropdown-item>
                <el-dropdown-item :command="true">{{ $t('mailUnreadOnly') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <ToolbarButton icon="refresh" :label="$t('refreshMail')" :busy="refreshing" @click="refresh" />
          </span>
        </template>
        <ToolbarButton v-else icon="refresh" :label="$t('refreshMail')" :busy="refreshing" @click="refresh" />
      </div>
      <div class="message-resize" role="separator" tabindex="0" aria-orientation="vertical"
           :aria-label="$t('mailResizeList')" :aria-valuenow="Math.round(listWidth || defaultWidth())" :aria-valuemin="minListWidth" :aria-valuemax="maxListWidth"
           @pointerdown="beginResize" @pointermove="resizeList" @pointerup="finishResize" @pointercancel="finishResize"
           @keydown.left.prevent="adjustWidth(-16)" @keydown.right.prevent="adjustWidth(16)" @dblclick="resetWidth" />
      <el-scrollbar ref="listBody" class="message-list-body" :aria-busy="loading">
        <el-skeleton v-if="loading && !rows.length" animated aria-hidden="true">
          <template #template>
            <div v-for="row in 6" :key="row" class="list-placeholder">
              <el-skeleton-item variant="text" class="placeholder-icon" />
              <el-skeleton-item variant="text" class="placeholder-sender" />
              <el-skeleton-item variant="text" class="placeholder-subject" />
              <el-skeleton-item variant="text" class="placeholder-snippet" />
            </div>
          </template>
        </el-skeleton>
        <div v-else-if="failed && !rows.length" class="workspace-empty" role="status">
          <NavigationIcon name="mail-alert" :size="28" />
          <p>{{ $t('mailListFailed') }}</p>
        </div>
        <div v-else-if="!rows.length" class="workspace-empty">
          <NavigationIcon :name="currentFolder?.icon || 'inbox'" :size="30" />
          <p>{{ $t(search.text || unreadOnly ? 'noMessagesFound' : 'mailFolderEmpty') }}</p>
        </div>
        <div v-for="row in rows" :key="rowId(row)" class="message-row"
             :class="{ 'message-current': messageId === rowId(row), 'message-selected': selected.includes(rowId(row)), unread: isUnread(row), 'draft-row': isDraft }">
          <span class="unread-dot" :class="{ 'is-unread': isUnread(row) }" role="img"
                :aria-label="isUnread(row) ? $t('mailUnreadOnly') : undefined" :aria-hidden="isUnread(row) ? undefined : 'true'" />
          <el-checkbox class="row-check" :model-value="selected.includes(rowId(row))"
                       :aria-label="$t('selectMail', { subject: row.subject || $t('noSubject') })"
                       @change="toggleSelected(rowId(row), $event)" />
          <span class="row-status">
            <ToolbarButton v-if="!isAdmin && !isDraft && folder !== 'trash'" class="row-star" :icon="row.isStar ? 'star-fill' : 'star'"
                           :label="$t('star')" :aria-pressed="!!row.isStar"
                           :disabled="starring.has(row.emailId)" @click="toggleStar(row)" />
            <span v-else class="row-kind"><NavigationIcon :name="isAdmin ? 'mail' : currentFolder.icon" :size="14" /></span>
          </span>
          <button type="button" class="message-summary" :aria-current="messageId === rowId(row) ? 'true' : undefined"
                  @click="open(row)">
            <span class="message-sender" :title="isDraft ? row.receiveEmail?.join(', ') : sender(row)">{{ sender(row) }}</span>
            <span class="message-copy">
              <span class="message-subject" :title="row.subject">{{ row.subject || $t('noSubject') }}</span>
              <span v-if="row.listText || row.text" class="message-snippet">{{ row.listText || row.text }}</span>
            </span>
            <time>{{ rowTime(row) }}</time>
          </button>
        </div>
      </el-scrollbar>
    </section>

    <section class="message-reading-pane" :aria-label="$t('mailReadingPane')" :aria-busy="!!messageId && !activeMessage">
      <MailReader v-if="activeMessage" :key="activeMessage.emailId" class="message-loaded" embedded @toggle-star="toggleStar(activeMessage)">
        <template #toolbar>
          <ToolbarButton icon="back" class="reader-back" :label="$t('goBack')" @click="closeReader" />
          <MessageActions v-if="actionFolder" :folder="actionFolder" :ids="[activeMessage.emailId]"
                          :can-reply="false" :can-file="activeMessage.type === 0" reader
                          @change="handleAction" @reply="uiStore.writerRef.openReply(activeMessage)"
                          @forward="uiStore.writerRef.openForward(activeMessage)" />
          <div v-if="isAdmin" class="admin-reader-actions">
            <ToolbarButton v-if="canDeleteAdmin && !actionFolder" icon="delete" :label="$t('mailPurge')" :busy="deleting"
                           @click="deleteAdmin([activeMessage.emailId])" />
            <el-dropdown trigger="click" placement="bottom-start" :show-arrow="false" @command="searchAdmin">
              <ToolbarButton :icon="actionFolder ? 'admin' : 'more'" :label="$t('navAdmin')" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="activeMessage.name" command="name">
                    <NavigationIcon name="user" :size="15" />{{ $t('sender') }} · {{ activeMessage.name }}
                  </el-dropdown-item>
                  <el-dropdown-item v-if="activeMessage.toEmail || activeMessage.sendEmail" command="accountEmail">
                    <NavigationIcon name="mail" :size="15" />{{ $t('selectEmail') }} · {{ adminAddress(activeMessage) }}
                  </el-dropdown-item>
                  <el-dropdown-item v-if="activeMessage.userEmail" command="userEmail">
                    <NavigationIcon name="search" :size="15" />{{ $t('user') }} · {{ activeMessage.userEmail }}
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canDeleteAdmin && actionFolder" command="purge" divided :disabled="deleting">
                    <NavigationIcon name="delete" :size="15" />{{ $t('mailPurge') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="reader-page-actions">
            <span v-if="activeIndex >= 0" class="reader-position">{{ $t('mailPositionOf', { index: offset + activeIndex + 1, total }) }}</span>
            <ToolbarButton icon="chevron" class="page-back" :label="$t('mailPreviousMessage')" :disabled="!previousMessage"
                           @click="open(previousMessage)" />
            <ToolbarButton icon="chevron" :label="$t('mailNextMessage')" :disabled="!nextMessage" @click="open(nextMessage)" />
          </div>
        </template>
      </MailReader>
      <template v-else-if="messageId">
        <div class="reader-placeholder-toolbar">
          <ToolbarButton icon="back" class="reader-back" :label="$t('goBack')" @click="closeReader" />
        </div>
        <el-skeleton class="reader-placeholder" animated aria-hidden="true">
          <template #template>
            <el-skeleton-item variant="h1" class="placeholder-heading" />
            <div class="placeholder-envelope">
              <el-skeleton-item variant="circle" class="placeholder-avatar" />
              <el-skeleton-item variant="text" class="placeholder-sender" />
            </div>
            <el-skeleton-item v-for="line in 3" :key="line" variant="text" class="placeholder-paragraph" />
          </template>
        </el-skeleton>
      </template>
      <div v-else class="workspace-empty">
        <span class="reading-empty-icon"><NavigationIcon name="mail" :size="28" /></span>
        <h2>{{ $t('mailSelectToRead') }}</h2>
        <p>{{ $t('mailSelectToReadHint') }}</p>
      </div>
    </section>
    <AdminCleanup v-if="isAdmin && canDeleteAdmin" v-model="cleanupOpen" @change="afterAdminCleanup" />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { emailRead, workspaceDetail, workspaceList } from '@/request/email.js'
import { allEmailDelete, allEmailDetail, allEmailList } from '@/request/all-email.js'
import { starAdd, starCancel } from '@/request/star.js'
import { useAccountStore } from '@/store/account.js'
import { useEmailStore } from '@/store/email.js'
import { useUserStore } from '@/store/user.js'
import { useSendStore } from '@/store/send.js'
import { useUiStore } from '@/store/ui.js'
import { useSettingStore } from '@/store/setting.js'
import { userDraftStore } from '@/store/draft.js'
import { fromNow } from '@/utils/day.js'
import { workspaceFolders } from '@/utils/mail-workspace.js'
import { EmailUnreadEnum } from '@/enums/email-enum.js'
import { hasPerm } from '@/perm/perm.js'
import db from '@/db/db.js'
import { removeDrafts } from '@/db/drafts.js'
import MailReader from '@/views/content/index.vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import ToolbarButton from '@/components/toolbar-button/index.vue'
import MessageActions from './MessageActions.vue'
import AdminCleanup from './AdminCleanup.vue'

const props = defineProps({ folder: { type: String, required: true } })
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const emailStore = useEmailStore()
const userStore = useUserStore()
const sendStore = useSendStore()
const uiStore = useUiStore()
const settingStore = useSettingStore()
const drafts = userDraftStore()
const currentFolder = computed(() => workspaceFolders.find(folder => folder.path === props.folder))
const isAdmin = computed(() => props.folder === 'all-mail')
const canDeleteAdmin = computed(() => hasPerm('all-email:delete'))
const search = computed(() => isAdmin.value ? emailStore.adminSearch
  : (props.folder === 'sent' ? sendStore : emailStore).searchParams)
const adminTypes = { all: 'all', receive: 'received', send: 'sent', delete: 'selectDeleted', noone: 'noRecipientTitle' }
const adminType = ref('receive')
const adminSort = ref(0)
const cleanupOpen = ref(false)
try {
  const saved = JSON.parse(localStorage.getItem('all-email-params'))
  if (saved?.type && Object.hasOwn(adminTypes, saved.type)) adminType.value = saved.type
  adminSort.value = Number(saved?.timeSort) === 1 ? 1 : 0
} catch {
  // An invalid local preference is ignored.
}
watch([adminType, adminSort], ([type, timeSort]) => localStorage.setItem('all-email-params', JSON.stringify({ type, timeSort })))
const isDraft = computed(() => props.folder === 'drafts')
const canReply = computed(() => emailStore.contentData.showReply && hasPerm('email:send'))
const messageId = computed(() => Number(route.params.messageId) || 0)
const loadedMessageId = ref(null)
const activeMessage = computed(() => {
  const entry = emailStore.contentData
  return messageId.value && loadedMessageId.value === messageId.value
    && entry.mailbox === props.folder && entry.viewerId === userStore.user.userId
    && entry.email?.emailId === messageId.value ? entry.email : null
})
const actionFolder = computed(() => isAdmin.value ? activeMessage.value?.personalFolder : props.folder)

const rows = ref([])
const selected = ref([])
const loading = ref(false)
const refreshing = ref(false)
const deleting = ref(false)
const failed = ref(false)
const unreadOnly = ref(false)
const starring = reactive(new Set())
const total = ref(0)
const offset = ref(0)
const listBody = ref(null)
const workspace = ref(null)
const minListWidth = 280
const maxListWidth = 560
const savedWidth = Number(localStorage.getItem('mail-list-px'))
const listWidth = ref(savedWidth >= minListWidth && savedWidth <= maxListWidth ? savedWidth : 0)
let resizePointer
const pageSize = 25
let listVersion = 0
let readerVersion = 0
let timer
let wakeTimer

const range = computed(() => t(messageId.value || !uiStore.wideReading ? 'mailListShortRange' : 'mailListRange', {
  first: total.value ? offset.value + 1 : 0, last: Math.min(total.value, offset.value + pageSize), total: total.value,
}))
const allSelected = computed({
  get: () => !!rows.value.length && rows.value.every(row => selected.value.includes(rowId(row))),
  set: value => { selected.value = value ? rows.value.map(rowId) : [] },
})
const selectionCanFile = computed(() => rows.value.every(row => !selected.value.includes(row.emailId) || row.type === 0))
const activeIndex = computed(() => rows.value.findIndex(row => rowId(row) === messageId.value))
const previousMessage = computed(() => rows.value[activeIndex.value - 1])
const nextMessage = computed(() => activeIndex.value >= 0 ? rows.value[activeIndex.value + 1] : undefined)

function rowId(row) {
  return isDraft.value ? row.draftId : row.emailId
}

function isUnread(row) {
  return !isDraft.value && row.unread === EmailUnreadEnum.UNREAD
}

function sender(row) {
  if (isDraft.value) return t('mailDraftStatus')
  if (!isAdmin.value && row.type === 1) {
    if (row.toEmail) return row.toEmail
    try { return JSON.parse(row.recipient || '[]').map(recipient => recipient.address).filter(Boolean).join(', ') || '—' }
    catch { return '—' }
  }
  return row.name || row.sendEmail || '—'
}

function adminAddress(row) {
  return row.type === 1 ? row.sendEmail : row.toEmail || row.sendEmail
}

function searchAdmin(field) {
  const row = activeMessage.value
  if (!row) return
  if (field === 'purge') return deleteAdmin([row.emailId])
  emailStore.setAdminSearch({ type: field, text: field === 'accountEmail' ? adminAddress(row) : row[field] })
  closeReader()
}

function handleAdminFilter(command) {
  if (command === 'sort') adminSort.value = adminSort.value ? 0 : 1
  else if (command === 'cleanup') cleanupOpen.value = true
  else adminType.value = command
}

function rowTime(row) {
  if (props.folder === 'snoozed' && row.snoozedUntil) {
    return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      .format(row.snoozedUntil)
  }
  return row.createTime ? fromNow(row.createTime) : ''
}

function toggleSelected(id, checked) {
  selected.value = checked ? [...selected.value, id] : selected.value.filter(item => item !== id)
}

async function reload() {
  const version = ++listVersion
  loading.value = true
  failed.value = false
  const folder = props.folder
  const accountId = accountStore.currentAccountId
  try {
    let result
    if (isAdmin.value) {
      if (!hasPerm('all-email:query')) return
      const { type, text } = search.value
      result = await allEmailList({
        offset: offset.value, size: pageSize, full: 0,
        type: adminType.value, timeSort: adminSort.value, [type]: text,
      })
    } else if (isDraft.value) {
      const draftsList = await db.value.draft.orderBy('createTime').reverse().toArray()
      drafts.count = draftsList.length
      const term = search.value.text?.trim().toLowerCase()
      const { startDate, endDate, type } = search.value
      const found = draftsList.filter(row => {
        if (startDate && row.createTime < startDate || endDate && row.createTime > endDate) return false
        if (!term) return true
        const source = type === 'content' ? row.text
          : type === 'sender' || type === 'senderAddress' ? row.sendEmail : row.subject
        return String(source || '').toLowerCase().includes(term)
      })
      result = { total: found.length, list: found.slice(offset.value, offset.value + pageSize) }
    } else {
      if (!accountId) return
      result = await workspaceList(folder, accountId, offset.value, pageSize, search.value, unreadOnly.value)
    }
    if (version !== listVersion) return
    if (offset.value && offset.value >= result.total) {
      offset.value = Math.max(0, Math.floor((result.total - 1) / pageSize) * pageSize)
      return reload()
    }
    rows.value = result.list
    total.value = result.total
    selected.value = selected.value.filter(id => rows.value.some(row => rowId(row) === id))
    scheduleSnoozedRefresh(result.nextSnoozeAt)
  } catch {
    if (version === listVersion) failed.value = true
  } finally {
    if (version === listVersion) loading.value = false
  }
}

function scheduleSnoozedRefresh(timestamp) {
  window.clearTimeout(wakeTimer)
  if (timestamp) {
    wakeTimer = window.setTimeout(() => {
      if (loading.value) return
      reload()
      emailStore.refreshUnreadCounts()
    }, Math.min(2_147_483_647, Math.max(100, timestamp - Date.now() + 100)))
  }
}

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await Promise.all([
      reload(),
      emailStore.refreshUnreadCounts(),
      new Promise(resolve => window.setTimeout(resolve, 300)),
    ])
  } finally {
    refreshing.value = false
  }
}

function changePage(direction) {
  offset.value += direction * pageSize
  selected.value = []
  listBody.value?.setScrollTop(0)
  reload()
}

function setUnreadOnly(value) {
  unreadOnly.value = value
}

function defaultWidth() {
  return 352
}

function clampWidth(value) {
  const available = workspace.value ? workspace.value.clientWidth - 360 : maxListWidth
  return Math.round(Math.min(maxListWidth, Math.max(minListWidth, Math.min(available, value))))
}

function adjustWidth(delta) {
  listWidth.value = clampWidth((listWidth.value || defaultWidth()) + delta)
  localStorage.setItem('mail-list-px', String(listWidth.value))
}

function resetWidth() {
  listWidth.value = 0
  localStorage.removeItem('mail-list-px')
}

function beginResize(event) {
  if (event.button !== 0) return
  resizePointer = event.pointerId
  event.currentTarget.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function resizeList(event) {
  if (event.pointerId !== resizePointer) return
  const rect = workspace.value.getBoundingClientRect()
  listWidth.value = clampWidth(event.clientX - rect.left)
}

function finishResize(event) {
  if (event.pointerId !== resizePointer) return
  resizePointer = undefined
  if (listWidth.value) localStorage.setItem('mail-list-px', String(listWidth.value))
}

watch([() => props.folder, () => isAdmin.value ? null : accountStore.currentAccountId,
  () => isAdmin.value ? null : accountStore.currentAccount?.allReceive, search, unreadOnly, adminType, adminSort],
  (values, previous) => {
    if (previous.length && values[0] !== previous[0]) unreadOnly.value = false
    if (!isAdmin.value && previous.length && values[0] === previous[0] && values[1] !== previous[1] && route.name === 'content') closeReader()
    offset.value = 0
    selected.value = []
    rows.value = []
    total.value = 0
    listBody.value?.setScrollTop(0)
    reload()
  }, { immediate: true })

watch(() => emailStore.workspaceRevision, () => reload())
watch(() => drafts.refreshList, () => {
  if (isDraft.value) reload()
})

async function open(row) {
  if (!row) return
  if (isDraft.value) {
    const attachments = await db.value.att.get(row.draftId)
    uiStore.writerRef.openDraft({ ...row, attachments: attachments?.attachments ?? [] })
    return
  }
  const to = { name: 'content', params: { mailbox: props.folder, messageId: row.emailId } }
  if (route.name === 'content') await router.replace(to)
  else await router.push(to)
}

function closeReader() {
  if (currentFolder.value) return router.replace({ name: currentFolder.value.name })
}

watch([() => route.fullPath, () => isAdmin.value ? null : accountStore.currentAccountId], async () => {
  const version = ++readerVersion
  loadedMessageId.value = null
  if (route.name !== 'content') return
  if (isAdmin.value && !hasPerm('all-email:query')) return router.replace({ name: 'email' })
  if (!isAdmin.value && !accountStore.currentAccountId) return
  if (!messageId.value) {
    const previous = emailStore.contentData
    if (previous.mailbox === props.folder && previous.viewerId === userStore.user.userId && previous.email?.emailId) {
      router.replace({ name: 'content', params: { mailbox: props.folder, messageId: previous.email.emailId } })
    } else closeReader()
    return
  }
  const folder = props.folder
  try {
    const detail = isAdmin.value ? await allEmailDetail(messageId.value)
      : await workspaceDetail(folder, accountStore.currentAccountId, messageId.value)
    if (version !== readerVersion) return
    if (!detail) return closeReader()
    emailStore.openMessage(detail, folder, true)
    loadedMessageId.value = detail.emailId
    if (folder !== 'trash' && !isAdmin.value && isUnread(detail)) {
      await emailRead([detail.emailId])
      if (version !== readerVersion) return
      applyRead([detail.emailId], false)
    }
  } catch (error) {
    if (version === readerVersion && (!activeMessage.value || error?.code === 404)) closeReader()
  }
}, { immediate: true })

function applyRead(ids, unread) {
  const value = unread ? EmailUnreadEnum.UNREAD : EmailUnreadEnum.READ
  for (const row of rows.value) {
    if (ids.includes(row.emailId)) row.unread = value
  }
  if (activeMessage.value && ids.includes(activeMessage.value.emailId)) activeMessage.value.unread = value
  emailStore.refreshUnreadCounts()
}

async function toggleStar(row) {
  const id = row.emailId
  if (starring.has(id)) return
  const value = row.isStar ? 0 : 1
  starring.add(id)
  try {
    await (value ? starAdd(id) : starCancel(id))
    const listRow = rows.value.find(item => item.emailId === id)
    if (listRow) listRow.isStar = value
    if (activeMessage.value?.emailId === id) activeMessage.value.isStar = value
    if (props.folder === 'starred' && !value) {
      if (messageId.value === id) closeReader()
      reload()
    }
  } catch {
    // The request layer shows the error.
  } finally {
    starring.delete(id)
  }
}

function handleAction({ ids, action }) {
  if (action === 'read' || action === 'unread') {
    applyRead(ids, action === 'unread')
    if (action === 'unread' && ids.includes(messageId.value)) closeReader()
    if (unreadOnly.value) reload()
    return
  }
  if (ids.includes(messageId.value)) closeReader()
  selected.value = []
  reload()
  emailStore.refreshUnreadCounts()
}

async function deleteAdmin(ids) {
  if (deleting.value || !canDeleteAdmin.value) return
  const targets = [...ids]
  deleting.value = true
  try {
    await ElMessageBox.confirm(t(targets.length > 1 ? 'delEmailsConfirm' : 'mailPurgeConfirm'), {
      confirmButtonText: t('mailPurge'), cancelButtonText: t('cancel'), type: 'warning',
    })
    await allEmailDelete(targets.join(','))
    ElMessage.success(t('delSuccessMsg'))
    handleAction({ ids: targets, action: 'purge' })
  } catch {
    // The request layer reports failures.
  } finally {
    deleting.value = false
  }
}

function afterAdminCleanup() {
  if (messageId.value) closeReader()
  reload()
  emailStore.refreshUnreadCounts()
}

async function discardDrafts() {
  const ids = [...selected.value]
  try {
    await ElMessageBox.confirm(t('mailDiscardDraftConfirm'), {
      confirmButtonText: t('mailDiscardDraft'), cancelButtonText: t('cancel'), type: 'warning',
    })
    await removeDrafts(ids)
    drafts.refreshList++
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(t('mailSaveDraftFailed'))
  }
}

function handleKeys(event) {
  if (event.key !== 'Escape' || event.defaultPrevented || !messageId.value) return
  // 菜单、浮层打开时 Esc 只负责关闭它们，不关闭阅读区
  if (event.target?.closest?.('.el-popper, .el-dropdown-menu, [aria-expanded="true"]')
    || [...document.querySelectorAll('.el-popper')].some(popper => popper.getClientRects().length
      && getComputedStyle(popper).display !== 'none' && popper.getAttribute('aria-hidden') !== 'true')) return
  if (document.querySelector('.el-overlay:not([style*="display: none"]), .write-box:not([style*="display: none"])')
    && [...document.querySelectorAll('.el-overlay, .write-box')].some(element => element.getClientRects().length)) return
  closeReader()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeys)
  let ticks = 0
  timer = window.setInterval(() => {
    ticks++
    const interval = Number(settingStore.settings.autoRefresh)
    const autoRefresh = props.folder === 'inbox' || (isAdmin.value && adminType.value === 'receive')
    if (autoRefresh && interval > 1 && ticks % interval === 0 && !loading.value
        && !refreshing.value && !document.hidden && !selected.value.length && !offset.value) {
      reload()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  listVersion++
  readerVersion++
  window.clearInterval(timer)
  window.clearTimeout(wakeTimer)
  document.removeEventListener('keydown', handleKeys)
})
</script>

<style scoped>
/*
 * 三栏：侧栏 232px（布局层）/ 列表 352px / 阅读区。
 * 行内对齐线（列表左缘起）：复选框 12px，状态列 36px，文本 62px，日期右对齐 16px。
 */
.mail-workspace {
  --row-pad-start: 4px;
  --row-pad-end: 16px;
  --row-dot: 12px;
  --row-check: 16px;
  --row-status: 22px;
  --row-gap: 6px;
  --row-text-start: calc(var(--row-pad-start) + var(--row-dot) + var(--row-check) + var(--row-status) + var(--row-gap) * 3);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  margin-block-start: 12px;
  overflow: hidden;
  border-radius: var(--r-panel);
  background: var(--mac-surface);
  box-shadow: 0 0 0 .5px rgb(0 0 0 / 10%), 0 4px 18px rgb(0 0 0 / 5%);
}
.mail-workspace.split-reading { grid-template-columns: var(--list-width, var(--mail-list-width, 352px)) minmax(0, 1fr); }
.message-list-pane, .message-reading-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--mac-surface);
}
.message-list-pane { position: relative; }
.split-reading .message-list-pane { border-inline-end: 1px solid var(--mac-line); }
.wide-reading:not(.has-message) .message-reading-pane,
.wide-reading .message-resize,
.wide-reading.has-message .message-list-pane { display: none; }
.split-reading .reader-back { display: none; }
.message-resize {
  position: absolute;
  z-index: 2;
  inset: 0 -4px 0 auto;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}
.message-resize::after {
  position: absolute;
  inset: 0 3px;
  background: transparent;
  content: '';
  transition: background-color 140ms ease;
}
.message-resize:hover::after, .message-resize:focus-visible::after { background: var(--mac-line-strong); }
.message-resize:focus-visible { outline: none; }

/* 窗格工具栏：两栏同高，底边连成一条线 */
.message-list-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: var(--workspace-toolbar);
  padding: 0 var(--row-pad-end) 0 calc(var(--row-pad-start) + var(--row-dot) + var(--row-gap));
  border-bottom: 1px solid var(--mac-line);
  background: var(--mac-chrome);
}
.message-list-toolbar > .el-checkbox { margin-inline-end: calc(var(--row-status)); height: 32px; }
.list-range {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-bulk-actions { justify-content: flex-end; }
.admin-reader-actions, .reader-page-actions { display: flex; align-items: center; gap: 4px; }
.reader-page-actions { margin-inline-start: auto; }
.reader-position { margin-inline-end: 8px; color: var(--mac-text-2); font-size: var(--mac-fs-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.page-back :deep(svg) { rotate: 180deg; }
.message-list-body { flex: 1; min-height: 0; }
.message-list-body :deep(.el-scrollbar__view) { display: flex; flex-direction: column; min-height: 100%; width: 100%; }

/* 骨架屏与真实行同尺寸 */
.list-placeholder {
  display: grid;
  grid-template-columns: var(--row-check) minmax(0, 1fr) 56px;
  grid-template-areas: 'icon sender date' 'icon subject subject' 'icon snippet snippet';
  align-content: center;
  gap: 4px calc(var(--row-status) + var(--row-gap) * 2);
  height: 72px;
  padding: 0 var(--row-pad-end) 0 calc(var(--row-pad-start) + var(--row-dot) + var(--row-gap));
  border-bottom: 1px solid var(--mac-line);
}
.list-placeholder .placeholder-icon { grid-area: icon; width: 14px; height: 14px; align-self: start; margin-top: 3px; }
.list-placeholder .placeholder-sender { grid-area: sender; width: 42%; height: 14px; }
.list-placeholder .placeholder-subject { grid-area: subject; width: 78%; height: 13px; }
.list-placeholder .placeholder-snippet { grid-area: snippet; width: 60%; height: 12px; }
.wide-reading .list-placeholder {
  height: 48px;
  grid-template-columns: var(--row-check) minmax(96px, 200px) minmax(0, 1fr);
  grid-template-areas: 'icon sender subject';
}
.wide-reading .list-placeholder .placeholder-sender { width: 70%; }
.wide-reading .list-placeholder .placeholder-snippet { display: none; }
.reader-placeholder-toolbar {
  display: flex;
  align-items: center;
  min-height: var(--workspace-toolbar);
  padding-inline: 16px;
  border-bottom: 1px solid var(--mac-line);
  background: var(--mac-chrome);
}
.reader-placeholder {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 24px 32px;
}
.placeholder-heading { width: min(45%, 330px); height: 24px; }
.placeholder-envelope { display: flex; align-items: center; gap: 12px; }
.placeholder-avatar { width: 40px; height: 40px; }
.placeholder-envelope .placeholder-sender { width: min(50%, 230px); }
.placeholder-paragraph { width: min(66%, 550px); margin-inline-start: 52px; }
.placeholder-paragraph:last-child { width: min(50%, 400px); }
@media (prefers-reduced-motion: no-preference) {
  .message-loaded { animation: mail-content-in var(--mac-dur-3) var(--mac-ease-out); }
}

/* 邮件行：三栏 72px，三行文本。未读点、复选框、星标都与发件人同一行 */
.message-row {
  position: relative;
  display: grid;
  grid-template-columns: var(--row-dot) var(--row-check) var(--row-status) minmax(0, 1fr);
  align-items: start;
  column-gap: var(--row-gap);
  min-height: 72px;
  padding: 10px var(--row-pad-end) 10px var(--row-pad-start);
  color: var(--mac-text);
  transition: background-color var(--mac-dur-1) ease;
}
.message-row::after {
  position: absolute;
  inset: auto 0 0 var(--row-text-start);
  height: 1px;
  background: var(--mac-line);
  content: '';
}
.message-row:hover { background: color-mix(in srgb, var(--mac-surface) 96%, var(--mac-text)); }
.message-row.message-current, .message-row.message-selected { background: var(--mac-selected-solid); }
.message-row:is(.message-current, .message-selected)::after,
.message-row:has(+ :is(.message-current, .message-selected))::after { background: transparent; }
.message-row > :is(.unread-dot, .el-checkbox, .row-status) { height: 18px; margin: 0; align-self: start; }
.row-status { display: grid; place-items: center; }
.row-kind { display: grid; place-items: center; color: var(--mac-text-2); }
.unread-dot {
  justify-self: center;
  width: 8px;
  height: 18px;
  background: radial-gradient(circle, transparent 0 0, transparent 0) center / 8px 8px no-repeat;
}
.unread-dot.is-unread { background: radial-gradient(circle closest-side, var(--mac-text) 98%, transparent) center / 8px 8px no-repeat; }
.toolbar-button.row-star {
  flex-basis: 22px;
  width: 22px;
  height: 22px;
  margin-top: -2px;
  border-radius: 6px;
  color: var(--mac-text-3);
  opacity: 0;
  transition: opacity var(--mac-dur-1) ease, color var(--mac-dur-1) ease, transform var(--mac-dur-2) var(--mac-spring);
}
.message-row:is(:hover, :focus-within) .row-star, .row-star[aria-pressed='true'] { opacity: 1; }
.row-star[aria-pressed='true'] { color: var(--mac-star); }
.row-star:active { transform: scale(.85); }
.row-star :deep(svg) { width: 15px; height: 15px; }
.message-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'sender date' 'copy copy';
  width: 100%;
  column-gap: 12px;
  min-width: 0;
  padding: 0;
  text-align: start;
  color: inherit;
  cursor: pointer;
}
.message-summary::before { position: absolute; inset: 0; content: ''; }
.message-row > .el-checkbox, .row-status > * { position: relative; z-index: 1; }
.message-summary:focus-visible { outline: none; }
.message-row:has(.message-summary:focus-visible) { box-shadow: inset 0 0 0 2px var(--mac-focus); border-radius: 6px; }
.message-copy { grid-area: copy; display: grid; min-width: 0; }
.message-sender, .message-subject, .message-snippet {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.message-sender { grid-area: sender; font-size: var(--mac-fs-body); line-height: 18px; font-weight: 600; }
.message-subject { font-size: var(--mac-fs-chrome); line-height: 18px; }
.message-snippet { color: var(--mac-text-2); font-size: var(--mac-fs-caption); line-height: 16px; }
.unread .message-subject { font-weight: 600; }
.message-summary time {
  grid-area: date;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-caption);
  line-height: 18px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}


/* 全宽列表：单行 48px */
.wide-reading .message-row {
  align-items: center;
  min-height: 48px;
  padding-block: 0;
}
.wide-reading .message-row > :is(.unread-dot, .el-checkbox, .row-status) { align-self: center; height: 20px; }
.wide-reading .message-summary {
  grid-template-columns: clamp(120px, 14vw, 200px) minmax(0, 1fr) auto;
  grid-template-areas: 'sender copy date';
  align-items: baseline;
  column-gap: 16px;
  min-height: 48px;
  align-content: center;
}
.wide-reading .message-copy { display: flex; align-items: baseline; gap: 0; }
.wide-reading .message-subject { flex: 0 1 auto; max-width: 70%; font-size: var(--mac-fs-body); line-height: 20px; }
.wide-reading .message-sender { line-height: 20px; font-weight: 400; }
.wide-reading .unread .message-sender { font-weight: 600; }
.wide-reading .message-snippet { flex: 1 1 0; min-width: 0; font-size: var(--mac-fs-chrome); line-height: 20px; }
.wide-reading .message-snippet::before { content: '  —  '; white-space: pre; }
.draft-row .message-sender { color: var(--mac-text-2); font-weight: 500; }

.workspace-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 170px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 8px;
  text-align: center;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
}
.workspace-empty h2 { color: var(--mac-text); font-size: 17px; line-height: 24px; font-weight: 600; }
.workspace-empty p { margin: 0; }
.reading-empty-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 14px;
  background: var(--mac-chrome);
  box-shadow: 0 0 0 1px var(--mac-line);
  color: var(--mac-text-2);
}
@media (prefers-reduced-motion: reduce) {
  .message-row, .message-resize::after { transition: none; }
}
@media (max-width: 1024px) {
  .mail-workspace.split-reading { grid-template-columns: minmax(0, 1fr); }
  .split-reading .message-list-pane { border-inline-end: 0; }
  .message-resize { display: none; }
  .mail-workspace:not(.has-message) .message-reading-pane, .has-message .message-list-pane { display: none; }
  .split-reading .reader-back { display: grid; }
}
@media (max-width: 767px) {
  .mail-workspace { margin-block-start: 8px; }
}
</style>

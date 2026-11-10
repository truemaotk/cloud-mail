<template>
  <section ref="workspace" class="mail-workspace"
           :class="{ 'has-message': messageId, 'wide-reading': uiStore.wideReading }"
           :style="{ '--list-width': listWidth ? listWidth + '%' : undefined }">
    <section class="message-list-pane" :aria-label="$t('mailReadingList')">
      <div class="message-list-toolbar">
        <el-checkbox v-model="allSelected" :indeterminate="!!selected.length && !allSelected"
                     :disabled="!rows.length" :aria-label="$t('selectAllMail')" />
        <h2 v-if="messageId && !selected.length" class="list-folder">{{ $t(currentFolder.label) }}</h2>
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
          <ToolbarButton icon="chevron" class="page-back" :label="$t('mailPreviousPage')"
                         :disabled="offset === 0" @click="changePage(-1)" />
          <ToolbarButton icon="chevron" :label="$t('mailNextPage')"
                         :disabled="offset + pageSize >= total" @click="changePage(1)" />
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
        </template>
        <ToolbarButton icon="refresh" :label="$t('refreshMail')" :busy="refreshing" @click="refresh" />
      </div>
      <div class="message-resize" role="separator" tabindex="0" aria-orientation="vertical"
           :aria-label="$t('mailResizeList')" :aria-valuenow="Math.round(listWidth || defaultWidth())" aria-valuemin="18" aria-valuemax="60"
           @pointerdown="beginResize" @pointermove="resizeList" @pointerup="finishResize" @pointercancel="finishResize"
           @keydown.left.prevent="adjustWidth(-2)" @keydown.right.prevent="adjustWidth(2)" />
      <el-scrollbar ref="listBody" class="message-list-body" :aria-busy="loading">
        <el-skeleton v-if="loading && !rows.length" animated aria-hidden="true">
          <template #template>
            <div v-for="row in 6" :key="row" class="list-placeholder">
              <el-skeleton-item variant="text" class="placeholder-icon" />
              <el-skeleton-item variant="text" class="placeholder-sender" />
              <el-skeleton-item variant="text" class="placeholder-subject" />
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
          <el-checkbox :model-value="selected.includes(rowId(row))"
                       :aria-label="$t('selectMail', { subject: row.subject || $t('noSubject') })"
                       @change="toggleSelected(rowId(row), $event)" />
          <ToolbarButton v-if="!isAdmin && !isDraft && folder !== 'trash'" class="row-star" :icon="row.isStar ? 'star-fill' : 'star'"
                         :label="$t('star')" :aria-pressed="!!row.isStar"
                         :disabled="starring.has(row.emailId)" @click="toggleStar(row)" />
          <span v-else class="row-kind"><NavigationIcon :name="isAdmin ? 'mail' : currentFolder.icon" :size="16" /></span>
          <button type="button" class="message-summary" :aria-current="messageId === rowId(row) ? 'true' : undefined"
                  @click="open(row)">
            <span class="message-sender" :title="isDraft ? row.receiveEmail?.join(', ') : undefined">{{ sender(row) }}</span>
            <span class="message-copy">
              <span class="message-subject">{{ row.subject || $t('noSubject') }}</span>
              <span v-if="row.listText || row.text" class="message-snippet">{{ row.listText || row.text }}</span>
            </span>
            <time>{{ rowTime(row) }}</time>
          </button>
          <span v-if="isUnread(row)" class="unread-dot" :aria-label="$t('mailUnreadOnly')" />
        </div>
      </el-scrollbar>
    </section>

    <section class="message-reading-pane" :aria-label="$t('mailReadingPane')" :aria-busy="!!messageId && !activeMessage">
      <MailReader v-if="activeMessage" :key="activeMessage.emailId" class="message-loaded" embedded @toggle-star="toggleStar(activeMessage)">
        <template #toolbar>
          <ToolbarButton icon="back" :label="$t('goBack')" @click="closeReader" />
          <MessageActions v-if="actionFolder" :folder="actionFolder" :ids="[activeMessage.emailId]"
                          :can-reply="canReply" :can-file="activeMessage.type === 0" reader
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
            <ToolbarButton icon="chevron" class="page-back" :label="$t('mailPreviousMessage')" :disabled="!previousMessage"
                           @click="open(previousMessage)" />
            <ToolbarButton icon="chevron" :label="$t('mailNextMessage')" :disabled="!nextMessage" @click="open(nextMessage)" />
          </div>
        </template>
      </MailReader>
      <template v-else-if="messageId">
        <div class="reader-placeholder-toolbar">
          <ToolbarButton icon="back" :label="$t('goBack')" @click="closeReader" />
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
const savedWidth = Number(localStorage.getItem('mail-list-width'))
const listWidth = ref(savedWidth >= 18 && savedWidth <= 60 ? savedWidth : 0)
let resizePointer
const pageSize = 25
let listVersion = 0
let readerVersion = 0
let timer
let wakeTimer

const range = computed(() => t(messageId.value ? 'mailListShortRange' : 'mailListRange', {
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
  return workspace.value ? Math.min(60, Math.max(18, 36000 / workspace.value.clientWidth)) : 22
}

function adjustWidth(delta) {
  listWidth.value = Math.min(60, Math.max(18, (listWidth.value || defaultWidth()) + delta))
  localStorage.setItem('mail-list-width', String(listWidth.value))
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
  listWidth.value = Math.min(60, Math.max(18, (event.clientX - rect.left) * 100 / rect.width))
}

function finishResize(event) {
  if (event.pointerId !== resizePointer) return
  resizePointer = undefined
  localStorage.setItem('mail-list-width', String(listWidth.value))
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
.mail-workspace {
  display: grid;
  grid-template-columns: max(300px, var(--list-width, 360px)) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  margin-block-start: 12px;
  overflow: hidden;
  border-radius: var(--mail-radius-surface) var(--mail-radius-surface) 0 0;
  background: var(--el-bg-color);
  box-shadow: 0 0 0 1px var(--mail-shell-line);
}
.message-list-pane, .message-reading-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.message-list-pane { position: relative; border-inline-end: 1px solid var(--mail-shell-line); }
.mail-workspace:not(.has-message), .mail-workspace.wide-reading { grid-template-columns: minmax(0, 1fr); }
.mail-workspace:not(.has-message) .message-list-pane { border-inline-end: 0; }
.mail-workspace:not(.has-message) .message-reading-pane,
.mail-workspace:not(.has-message) .message-resize,
.mail-workspace.has-message.wide-reading .message-list-pane { display: none; }
.message-resize {
  position: absolute;
  z-index: 1;
  inset: 0 -4px 0 auto;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}
.message-resize:hover, .message-resize:focus-visible { background: var(--mail-shell-hover); }
.message-list-toolbar {
  display: flex;
  flex-wrap: wrap;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: var(--workspace-toolbar);
  padding: 6px 16px;
  border-bottom: 1px solid var(--mail-shell-line);
}
.message-list-toolbar > .el-checkbox { margin-inline-end: 0; }
.has-message .message-list-toolbar { gap: 4px; padding-inline: 12px; }
.has-message .message-list-toolbar :deep(.toolbar-button) { width: 30px; }
.list-folder {
  margin-inline: 4px auto;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}
.list-range {
  flex: 1 1 auto;
  color: var(--mail-shell-muted);
  text-align: end;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.list-bulk-actions { justify-content: flex-end; }
.admin-reader-actions, .reader-page-actions { display: flex; align-items: center; gap: 6px; }
.reader-page-actions { margin-inline-start: auto; }
.page-back :deep(svg) { rotate: 180deg; }
.message-list-body { flex: 1; min-height: 0; }
.message-list-body :deep(.el-scrollbar__view) { display: flex; flex-direction: column; min-height: 100%; }
.list-placeholder {
  display: grid;
  grid-template-columns: 18px minmax(64px, 132px) minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--mail-shell-line);
}
.list-placeholder .placeholder-icon { width: 14px; height: 14px; }
.list-placeholder .placeholder-subject { width: 68%; }
.has-message .list-placeholder {
  min-height: 94px;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 5px 14px;
}
.has-message .list-placeholder .placeholder-sender { width: 40%; }
.has-message .list-placeholder .placeholder-subject { grid-column: 2; }
.reader-placeholder-toolbar {
  display: flex;
  align-items: center;
  min-height: var(--workspace-toolbar);
  padding-inline: 16px;
  border-bottom: 1px solid var(--mail-shell-line);
}
.reader-placeholder {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 18px 22px;
}
.placeholder-heading { width: min(45%, 330px); height: 22px; }
.placeholder-envelope { display: flex; align-items: center; gap: 12px; }
.placeholder-avatar { width: 44px; height: 44px; }
.placeholder-envelope .placeholder-sender { width: min(50%, 230px); }
.placeholder-paragraph { width: min(66%, 550px); margin-inline-start: 56px; }
.placeholder-paragraph:last-child { width: min(50%, 400px); }
@media (prefers-reduced-motion: no-preference) {
  .message-loaded, .message-row { animation: mail-content-in 180ms ease-out; }
}
.message-row {
  position: relative;
  display: grid;
  grid-template-columns: 20px 30px minmax(0, 1fr);
  align-items: start;
  gap: 7px;
  min-height: 94px;
  padding: 12px 16px 11px;
  border-bottom: 1px solid var(--mail-shell-line);
}
.message-row:hover, .message-row:focus-within { background: var(--mail-shell-rail); }
.message-row.message-current, .message-row.message-selected { background: var(--mail-shell-active); }
.message-current::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--mail-shell-marker);
  content: '';
}
.message-row > .el-checkbox, .message-row > .toolbar-button, .row-kind { height: 25px; }
.message-row > .el-checkbox { margin: 0; }
.row-kind { display: grid; place-items: center; color: var(--mail-shell-muted); }
.row-star { width: 28px; }
.row-star[aria-pressed='true'] { color: var(--el-color-warning); }
.message-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'sender date' 'copy copy';
  width: 100%;
  gap: 4px 12px;
  min-width: 0;
  text-align: start;
  color: var(--el-text-color-primary);
  cursor: pointer;
}
.message-summary:focus-visible { border-radius: 4px; }
.message-copy { grid-area: copy; display: grid; min-width: 0; gap: 3px; }
.message-sender, .message-subject, .message-snippet {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.message-sender { grid-area: sender; font-size: 14px; }
.message-subject { font-size: 14px; }
.unread :is(.message-sender, .message-subject) { font-weight: 650; }
.message-summary time, .message-snippet { color: var(--mail-shell-muted); font-size: 12px; }
.message-summary time { grid-area: date; white-space: nowrap; font-variant-numeric: tabular-nums; }
.unread-dot {
  position: absolute;
  inset-inline-end: 15px;
  inset-block-start: 43px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mail-shell-marker);
  pointer-events: none;
}
.has-message .unread .message-copy { padding-inline-end: 12px; }
.mail-workspace:not(.has-message) .message-row {
  align-items: center;
  min-height: 48px;
  padding-block: 6px;
}
.mail-workspace:not(.has-message) .message-summary {
  grid-template-columns: clamp(96px, 12vw, 170px) minmax(0, 1fr) auto;
  grid-template-areas: 'sender copy date';
  align-items: baseline;
  gap: 12px;
}
.mail-workspace:not(.has-message) .message-copy {
  display: flex;
  align-items: baseline;
  gap: 0;
}
.mail-workspace:not(.has-message) .message-subject { flex: 0 1 auto; max-width: 85%; }
.mail-workspace:not(.has-message) .message-snippet { flex: 1 1 0; min-width: 0; }
.mail-workspace:not(.has-message) .message-snippet::before { content: ' · '; white-space: pre; }
.mail-workspace:not(.has-message) .unread time { padding-inline-end: 12px; }
.mail-workspace:not(.has-message) .unread-dot { inset-block-start: calc(50% - 3px); }
.draft-row .message-sender { color: var(--el-color-danger); }
.workspace-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 170px;
  align-items: center;
  justify-content: center;
  padding: 22px;
  gap: 9px;
  text-align: center;
  color: var(--mail-shell-muted);
}
.workspace-empty h2 { color: var(--el-text-color-primary); font-size: 17px; font-weight: 600; }
.workspace-empty p { margin: 0; }
.reading-empty-icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  margin-bottom: 4px;
  border: 1px solid var(--mail-shell-line);
  border-radius: 15px;
  background: var(--mail-shell-rail);
}
@media (max-width: 1024px) {
  .mail-workspace { grid-template-columns: minmax(0, 1fr); }
  .message-list-pane { border-inline-end: 0; }
  .message-resize { display: none; }
  .mail-workspace:not(.has-message) .message-reading-pane, .has-message .message-list-pane { display: none; }
}

@media (max-width: 767px) {
  .mail-workspace { margin-block-start: 8px; }
}
@media (max-width: 560px) {
  .mail-workspace:not(.has-message) .message-summary {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'sender date' 'copy copy';
    gap: 3px 8px;
  }
  .mail-workspace:not(.has-message) .message-row { min-height: 64px; }
}
</style>

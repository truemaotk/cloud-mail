<template>
  <div class="box" :class="{ embedded }">
    <section class="reader-surface" :aria-label="$t('message')">
      <div class="mail-toolbar">
        <slot name="toolbar">
          <ToolbarButton icon="back" :label="$t('goBack')" @click="handleBack" />
          <ToolbarButton v-perm="'email:delete'" icon="delete" :label="$t('delete')" @click="handleDelete" />
        </slot>
      </div>
      <el-scrollbar class="scrollbar">
        <article class="reader">
          <header class="reader-header">
            <div class="subject-row">
              <h2 class="email-title">{{ email.subject || $t('noSubject') }}</h2>
              <span v-if="mailboxLabel" class="mailbox-label">{{ $t(mailboxLabel) }}</span>
              <ToolbarButton v-if="embedded && emailStore.contentData.showStar" class="reader-star subject-star"
                             :icon="email.isStar ? 'star-fill' : 'star'" :label="$t('star')"
                             :aria-pressed="!!email.isStar" @click="emit('toggle-star')" />
            </div>
            <div class="envelope">
              <span class="sender-icon" aria-hidden="true">{{ senderInitial }}</span>
              <div class="sender">
                <div class="sender-line">
                  <strong>{{ senderName }}</strong>
                  <span v-if="senderAddress" class="sender-email">&lt;{{ senderAddress }}&gt;</span>
                  <el-tooltip v-if="sentViaEmail" effect="dark" :content="$t('sentVia', { email: sentViaEmail })">
                    <el-tag size="small" disable-transitions>{{ $t('sentViaTag') }}</el-tag>
                  </el-tooltip>
                </div>
                <el-tooltip v-model:visible="showEnvelope" trigger="click" placement="bottom-start"
                            role="dialog" effect="light" :aria-label="$t('mailHeaderDetails')"
                            popper-class="mail-envelope-popover" :show-arrow="false" :offset="6"
                            :popper-options="envelopePosition">
                  <button type="button" class="recipient-line" @keydown.esc.stop="showEnvelope = false">
                    <span>{{ $t('recipient') }}</span>
                    <span class="recipient-address">{{ recipientAddresses || email.toEmail || '—' }}</span>
                    <NavigationIcon name="chevron" class="recipient-chevron" :size="12" />
                  </button>
                  <template #content>
                    <section class="envelope-panel" @keydown.esc.stop="showEnvelope = false">
                      <h3>{{ $t('mailHeaderDetails') }}</h3>
                      <dl class="envelope-details">
                        <dt>{{ $t('from') }}</dt>
                        <dd>
                          <strong>{{ senderName }}</strong>
                          <span v-if="senderAddress" class="envelope-address">{{ senderAddress }}</span>
                        </dd>
                        <dt>{{ $t('recipient') }}</dt>
                        <dd>{{ recipientAddresses || email.toEmail || '—' }}</dd>
                        <dt v-if="copyAddresses">{{ $t('mailCc') }}</dt>
                        <dd v-if="copyAddresses">{{ copyAddresses }}</dd>
                        <dt v-if="blindCopyAddresses">{{ $t('mailBcc') }}</dt>
                        <dd v-if="blindCopyAddresses">{{ blindCopyAddresses }}</dd>
                        <dt v-if="email.createTime">{{ $t('date') }}</dt>
                        <dd v-if="email.createTime">{{ formatDetailDate(email.createTime) }}</dd>
                      </dl>
                    </section>
                  </template>
                </el-tooltip>
              </div>
              <div class="envelope-actions">
                <time v-if="email.createTime" class="email-date">{{ formatDetailDate(email.createTime) }}</time>
                <ToolbarButton v-if="!embedded && emailStore.contentData.showStar" class="reader-star" :icon="email.isStar ? 'star-fill' : 'star'"
                               :label="$t('star')" :aria-pressed="!!email.isStar" @click="changeStar" />
                <ToolbarButton v-if="canReply" icon="reply" :label="$t('reply')" @click="openReply" />
              </div>
            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </header>
          <div class="reader-body">
            <ShadowHtml v-if="email.content" class="shadow-html" :html="formatImage(email.content)" />
            <pre v-else class="email-text">{{ email.text }}</pre>
          </div>
          <section v-if="email.attList?.length" class="att" :aria-label="$t('attachments')">
            <div class="att-title">
              <span>{{ $t('attachments') }}</span>
              <span>{{ $t('attCount', { total: email.attList.length }) }}</span>
            </div>
            <div class="att-box">
              <div v-for="att in email.attList" :key="att.attId" class="att-item">
                <div class="att-icon">
                  <NavigationIcon :name="getIconByName(att.filename)" :size="22" />
                </div>
                <div class="att-name" :title="att.filename">{{ att.filename }}</div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="att-icon">
                  <ToolbarButton v-if="isImage(att.filename)" icon="eye" :label="$t('preview')" @click="showImage(att.key)" />
                  <a class="toolbar-button" :href="cvtR2Url(att.key)" :aria-label="$t('download') + ' ' + att.filename"
                     :title="$t('download')" download>
                    <NavigationIcon name="download" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </article>
      </el-scrollbar>
      <footer v-if="canReply" class="reader-footer" :aria-label="$t('reply') + ' / ' + $t('forward')">
        <button type="button" class="reply-button" @click="openReply">
          <NavigationIcon name="reply" :size="17" />
          {{ $t('reply') }}
        </button>
        <button type="button" class="reply-button" @click="openForward">
          <NavigationIcon name="forward" :size="17" />
          {{ $t('forward') }}
        </button>
      </footer>
    </section>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
  </div>
</template>
<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import ToolbarButton from '@/components/toolbar-button/index.vue'
import ShadowHtml from '@/components/shadow-html/index.vue'
import {computed, reactive, ref, watch, onMounted, onUnmounted} from "vue";
import {useRoute, useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead} from "@/request/email.js";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import {hasPerm} from "@/perm/perm.js";
import { mailFolders } from '@/utils/mail-workspace.js'
const props = defineProps({ embedded: Boolean })
const emit = defineEmits(['toggle-star'])
const { t } = useI18n()

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const userStore = useUserStore();
const router = useRouter()
const route = useRoute()
const canReply = computed(() => emailStore.contentData.showReply && hasPerm('email:send'))
const mailboxLabel = computed(() => mailFolders.find(folder =>
  folder.path === (email.value.personalFolder || route.params.mailbox))?.label)

const showPreview = ref(false)
const showEnvelope = ref(false)
const envelopePosition = { modifiers: [{ name: 'preventOverflow', options: { padding: 12 } }] }
const srcList = reactive([])


const email = computed(() => emailStore.contentData.email || {
  emailId: 0,
  attList: [],
  content: '',
  text: '',
  recipient: '[]',
})

const sentViaEmail = computed(() => {
  const raw = String(email.value.senderEmail || '').trim()
  if (!raw) return ''
  const matched = raw.match(/<([^>]+)>/)
  const address = (matched ? matched[1] : raw).trim()
  if (!address || address.toLowerCase() === String(email.value.sendEmail || '').trim().toLowerCase()) return ''
  return address
})

const senderName = computed(() => email.value.name || email.value.sendEmail || '—')
const senderInitial = computed(() => {
  const source = String(email.value.name || email.value.sendEmail || '?').replace(/^["'\s]+/, '')
  return (Array.from(source)[0] || '?').toUpperCase()
})
const senderAddress = computed(() => email.value.sendEmail !== senderName.value ? email.value.sendEmail : '')
function addresses(value) {
  try {
    const recipients = JSON.parse(value || '[]')
    return Array.isArray(recipients)
      ? [...new Set(recipients.map(item => item?.address).filter(Boolean))].join('、') : ''
  } catch {
    return ''
  }
}
const recipientAddresses = computed(() => addresses(email.value.recipient))
const copyAddresses = computed(() => addresses(email.value.cc))
const blindCopyAddresses = computed(() => email.value.type === 1 ? addresses(email.value.bcc) : '')

watch(() => accountStore.currentAccountId, () => {
  if (!props.embedded) handleBack()
})

let readRequesting = false

function tryMarkRead() {
  if (props.embedded || !emailStore.contentData.showUnread || readRequesting) return
  const current = email.value
  if (!current?.emailId || current.unread !== EmailUnreadEnum.UNREAD) return

  // 等详情数据就绪（detailMap 已写入，或正文已有内容）再标已读
  const full = emailStore.detailMap[current.emailId]
  const detailReady = !!full || !!(current.content || current.text)
  if (!detailReady) return

  readRequesting = true
  const emailId = current.emailId
  current.unread = EmailUnreadEnum.READ
  if (emailStore.detailMap[emailId]) {
    emailStore.detailMap[emailId].unread = EmailUnreadEnum.READ
  }
  emailStore.markListRead(emailId)
  emailRead([emailId]).then(() => {
    emailStore.refreshUnreadCounts()
  }).catch(() => {
    // The request layer displays the error.
  }).finally(() => {
    readRequesting = false
  })
}

watch(
  () => [
    email.value?.emailId,
    email.value?.content,
    email.value?.text,
    emailStore.detailMap[email.value?.emailId]
  ],
  () => tryMarkRead(),
  { flush: 'post' }
)

onMounted(() => {
  if (props.embedded) return
  const { mailbox, viewerId } = emailStore.contentData
  if (!email.value.emailId || mailbox !== route.params.mailbox || viewerId !== userStore.user.userId) {
    router.replace('/' + route.params.mailbox)
    return
  }
  tryMarkRead()
  window.addEventListener('keydown', handleKeyDown);
})

onUnmounted(() => {
  if (props.embedded) return
  emailStore.contentData.showUnread = false;
  readRequesting = false
  window.removeEventListener('keydown', handleKeyDown);
})

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (showPreview.value) return;
  if (showEnvelope.value) {
    showEnvelope.value = false
    return
  }
  if (document.querySelector('.el-message-box')) return;
  const writeBox = document.querySelector('.write-box');
  if (writeBox && writeBox.offsetParent !== null) return;
  handleBack();
}

function openReply() {
  uiStore.writerRef.openReply(email.value)
}

function openForward() {
  uiStore.writerRef.openForward(email.value)
}

function toMessage(message) {
  try {
    return JSON.parse(message)?.message || t('bounced')
  } catch {
    return message || t('bounced')
  }
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return  content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function changeStar() {
  if (email.value.isStar) {
    email.value.isStar = 0;
    starCancel(email.value.emailId).then(() => {
      email.value.isStar = 0;
      emailStore.cancelStarEmailId = email.value.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.value.emailId])
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 1;
    })
  } else {
    email.value.isStar = 1;
    starAdd(email.value.emailId).then(() => {
      email.value.isStar = 1;
      emailStore.addStarEmailId = email.value.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email.value)
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 0;
    })
  }
}

const handleBack = () => {
  router.back()
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    } else  {

      allEmailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    }

    router.back()
  })
}
</script>
<style scoped lang="scss">
/*
 * 阅读区：内边距 32px；头像 40px + 12px 间距，主题、发件人、正文共用同一条左侧基线（--message-indent）。
 * 回复／转发固定在左下，正文底部预留 --reader-dock 高度，最后一段和附件可完整滚到按钮上方。
 */
.box {
  height: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 12px var(--mail-shell-gutter, 16px) 0;
  background-color: var(--mac-app);
}
.reader-surface {
  --reader-gutter: 32px;
  --reader-dock: 76px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: var(--mail-radius-surface) var(--mail-radius-surface) 0 0;
  background: var(--mac-surface);
  box-shadow: 0 0 0 1px var(--mac-line);
}
.box.embedded {
  padding: 0;
  background: var(--mac-surface);
}
.embedded .reader-surface { border-radius: 0; box-shadow: none; }
.mail-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  min-height: var(--workspace-toolbar, 52px);
  padding: 0 16px;
  border-bottom: 1px solid var(--mac-line);
  background: var(--mac-chrome);
  overflow-x: auto;
  scrollbar-width: none;
}
.mail-toolbar :deep(.message-actions) { flex-wrap: nowrap; }
.scrollbar {
  flex: 1;
  min-height: 0;
}
.reader {
  --avatar-size: 40px;
  --avatar-gap: 12px;
  --message-indent: calc(var(--avatar-size) + var(--avatar-gap));
  max-width: 980px;
  padding: 24px var(--reader-gutter) calc(var(--reader-dock) + 24px);
}
.subject-row, .reader-body, .email-msg, .att {
  margin-inline-start: var(--message-indent);
}
.subject-row {
  display: flex;
  align-items: flex-start;
  gap: 8px 12px;
  margin-block-end: 16px;
}
.email-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--mac-text);
  font-size: var(--mac-fs-title);
  line-height: var(--mac-lh-title);
  font-weight: 600;
  letter-spacing: -.01em;
  overflow-wrap: anywhere;
}
.mailbox-label {
  flex: none;
  margin-top: 4px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--mac-hover);
  color: var(--mac-text-2);
  font-size: var(--mac-fs-caption);
  line-height: 20px;
  white-space: nowrap;
}
.subject-star { flex: none; margin-top: -2px; }
.reader-star[aria-pressed='true'] { color: var(--mac-star); }
.envelope {
  display: grid;
  grid-template-columns: var(--avatar-size) minmax(0, 1fr) auto;
  align-items: start;
  gap: 0 var(--avatar-gap);
}
.sender-icon {
  display: grid;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  background: linear-gradient(180deg, #A4A9B3, #868B95);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
}
.sender { display: grid; min-width: 0; gap: 2px; }
.sender-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.sender-line strong {
  color: var(--mac-text);
  font-size: var(--mac-fs-body);
  line-height: var(--mac-lh-body);
  font-weight: 600;
}
.sender-email {
  min-width: 0;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  word-break: break-all;
}
.recipient-line, .email-date {
  color: var(--mac-text-2);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
}
.recipient-line {
  display: inline-flex;
  justify-self: start;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 24px;
  padding: 2px 6px;
  margin-inline-start: -6px;
  border-radius: 6px;
  text-align: start;
  cursor: pointer;
  &:hover, &[aria-expanded="true"] {
    background: var(--mac-hover);
    color: var(--mac-text);
  }
  &:focus-visible { outline: 2px solid var(--mac-focus); outline-offset: 0; }
}
.recipient-address {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recipient-line > :first-child,
.recipient-chevron {
  flex: none;
}
.recipient-chevron {
  transition: transform 140ms ease;
}
.recipient-line[aria-expanded="true"] .recipient-chevron {
  transform: rotate(90deg);
}
.envelope-panel h3 {
  margin: 0;
  padding-block-end: 8px;
  border-bottom: 1px solid var(--mac-line);
  color: var(--mac-text);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-weight: 600;
}
.envelope-details {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 12px;
  margin: 12px 0 0;
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  overflow-wrap: anywhere;
  dt {
    color: var(--mac-text-2);
    font-weight: 600;
    text-align: end;
  }
  dd {
    margin: 0;
    color: var(--mac-text);
  }
}
.envelope-address {
  display: block;
  color: var(--mac-text-2);
}
.envelope-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: -6px;
}
.email-date {
  padding-inline-end: 4px;
  font-size: var(--mac-fs-caption);
  line-height: var(--mac-lh-caption);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.email-msg {
  margin-top: 16px;
}
.reader-body {
  margin-block-start: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--mac-line);
}
.shadow-html {
  position: relative;
}
.shadow-html::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--message-block-color);
  pointer-events: none;
}
.email-text {
  margin: 0;
  color: var(--mac-text);
  font-family: inherit;
  font-size: var(--mac-fs-reading);
  line-height: var(--mac-lh-reading);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.att {
  max-width: 680px;
  margin-block-start: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--mac-line);
}
.att-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-weight: 600;
  > span:last-child {
    color: var(--mac-text-2);
    font-size: var(--mac-fs-caption);
    font-weight: 400;
  }
}
.att-box {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.att-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 48px;
  padding: 4px 4px 4px 12px;
  border: 1px solid var(--mac-line);
  border-radius: 10px;
  background: var(--mac-chrome);
  font-size: var(--mac-fs-chrome);
}
.att-icon {
  display: flex;
  color: var(--mac-text-2);
}
.att-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.att-size {
  color: var(--mac-text-2);
  white-space: nowrap;
  font-size: var(--mac-fs-caption);
  font-variant-numeric: tabular-nums;
}
.reader-footer {
  position: absolute;
  z-index: 2;
  inset-inline-start: calc(var(--reader-gutter) + 52px);
  inset-block-end: 20px;
  display: flex;
  gap: 8px;
  padding: 4px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--mac-surface) 88%, transparent);
  box-shadow: var(--mac-shadow-pop);
  backdrop-filter: blur(12px) saturate(1.4);
}
@supports not (backdrop-filter: blur(1px)) {
  .reader-footer { background: var(--mac-surface); }
}
.reply-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 32px;
  padding-inline: 12px;
  border-radius: var(--mail-radius-control);
  color: var(--mac-text);
  font-size: var(--mac-fs-chrome);
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: var(--mac-hover);
  }
  &:focus-visible { outline: 2px solid var(--mac-focus); outline-offset: -2px; }
}
@media (max-width: 1280px) {
  .reader-surface { --reader-gutter: 24px; }
}
@media (max-width: 620px) {
  .box {
    padding: 4px 6px 0;
  }
  .reader-surface { --reader-gutter: 16px; }
  .reader {
    --avatar-size: 36px;
    --avatar-gap: 10px;
  }
  .subject-row, .reader-body, .email-msg, .att {
    margin-inline-start: 0;
  }
  .reader-footer { inset-inline-start: var(--reader-gutter); }
  .envelope {
    grid-template-columns: var(--avatar-size) minmax(0, 1fr);
  }
  .envelope-actions {
    grid-column: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-top: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .recipient-chevron { transition: none; }
}
</style>

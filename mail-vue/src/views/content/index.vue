<template>
  <div class="box">
    <section class="reader-surface" :aria-label="$t('message')">
      <div class="mail-toolbar">
        <ToolbarButton icon="back" :label="$t('goBack')" @click="handleBack" />
        <ToolbarButton v-perm="'email:delete'" icon="delete" :label="$t('delete')" @click="handleDelete" />
      </div>
      <el-scrollbar class="scrollbar">
        <article class="reader">
          <header class="reader-header">
            <div class="subject-row">
              <h2 class="email-title">{{ email.subject || $t('noSubject') }}</h2>
              <span v-if="mailboxLabel" class="mailbox-label">{{ $t(mailboxLabel) }}</span>
            </div>
            <div class="envelope">
              <span class="sender-icon"><NavigationIcon name="user" :size="19" /></span>
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
                        <dt v-if="email.createTime">{{ $t('date') }}</dt>
                        <dd v-if="email.createTime">{{ formatDetailDate(email.createTime) }}</dd>
                      </dl>
                    </section>
                  </template>
                </el-tooltip>
              </div>
              <div class="envelope-actions">
                <time v-if="email.createTime" class="email-date">{{ formatDetailDate(email.createTime) }}</time>
                <ToolbarButton v-if="emailStore.contentData.showStar" :icon="email.isStar ? 'star-fill' : 'star'"
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
          <footer v-if="canReply" class="reader-footer">
            <button type="button" class="reply-button" @click="openReply">
              <NavigationIcon name="reply" :size="17" />
              {{ $t('reply') }}
            </button>
            <button type="button" class="reply-button" @click="openForward">
              <NavigationIcon name="forward" :size="17" />
              {{ $t('forward') }}
            </button>
          </footer>
        </article>
      </el-scrollbar>
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
const { t } = useI18n()

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const userStore = useUserStore();
const router = useRouter()
const route = useRoute()
const canReply = computed(() => emailStore.contentData.showReply && hasPerm('email:send'))
const mailboxLabel = computed(() => ['inbox', 'sent', 'starred'].find(folder => folder === route.params.mailbox))

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
const senderAddress = computed(() => email.value.sendEmail !== senderName.value ? email.value.sendEmail : '')
const recipientAddresses = computed(() => {
  try {
    const recipients = JSON.parse(email.value.recipient || '[]')
    return Array.isArray(recipients)
      ? [...new Set(recipients.map(item => item?.address).filter(Boolean))].join('、') : ''
  } catch {
    return ''
  }
})

watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

let readRequesting = false

function tryMarkRead() {
  if (!emailStore.contentData.showUnread || readRequesting) return
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
  const { mailbox, viewerId } = emailStore.contentData
  if (!email.value.emailId || mailbox !== route.params.mailbox || viewerId !== userStore.user.userId) {
    router.replace('/' + route.params.mailbox)
    return
  }
  tryMarkRead()
  window.addEventListener('keydown', handleKeyDown);
})

onUnmounted(() => {
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
.box {
  --reader-canvas: #f6f8fc;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 4px clamp(16px, 2.5vw, 48px) 16px 10px;
  background-color: var(--reader-canvas);
}

:global(.mail-shell-dark) .box {
  --reader-canvas: var(--mail-shell-rail);
}

.reader-surface {
  --reader-gutter: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: var(--el-bg-color);
}

.mail-toolbar {
  flex-shrink: 0;
  min-height: 48px;
  padding-inline: 10px;
  border-bottom: 0;
}

.scrollbar {
  flex: 1;
  min-height: 0;
}

.reader {
  --avatar-size: 40px;
  --avatar-gap: 16px;
  --message-indent: calc(var(--avatar-size) + var(--avatar-gap));
  padding: 18px clamp(16px, 1.7vw, 32px) 48px var(--reader-gutter);
}

.subject-row, .reader-body, .reader-footer, .email-msg, .att {
  margin-inline-start: var(--message-indent);
}

.subject-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-block-end: 20px;
}

.email-title {
  min-width: 0;
  font-size: clamp(20px, 1.4vw, 24px);
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.mailbox-label {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--mail-shell-hover);
  color: var(--mail-shell-muted);
  font-size: 12px;
}

.envelope {
  display: grid;
  grid-template-columns: var(--avatar-size) minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px var(--avatar-gap);
}

.sender-icon {
  display: grid;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  border-radius: 50%;
  background: var(--mail-shell-hover);
  color: var(--mail-shell-muted);
}

.sender-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 8px;
  overflow-wrap: anywhere;
}

.sender-line strong {
  font-size: 14px;
  font-weight: 600;
}

.sender-email, .recipient-line, .email-date {
  color: var(--mail-shell-muted);
  font-size: 13px;
}

.recipient-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 24px;
  padding: 1px 6px;
  margin-inline-start: -6px;
  border-radius: var(--mail-radius-control);
  text-align: start;
  cursor: pointer;

  &:hover, &[aria-expanded="true"] {
    background: var(--mail-shell-hover);
  }
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
  padding-block-end: 9px;
  border-bottom: 1px solid var(--mail-shell-line);
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.envelope-details {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 14px;
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;

  dt {
    color: var(--mail-shell-muted);
  }

  dd {
    margin: 0;
    color: var(--el-text-color-primary);
  }
}

.envelope-address {
  display: block;
  color: var(--mail-shell-muted);
}

.envelope-actions {
  align-self: start;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.email-date {
  padding-inline-end: 4px;
  font-variant-numeric: tabular-nums;
}

.email-msg {
  margin-top: 14px;
}

.reader-body {
  margin-block-start: 21px;
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
  font-family: inherit;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.att {
  max-width: 680px;
  margin-block-start: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--mail-shell-line);
}

.att-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 600;

  > span:last-child {
    color: var(--mail-shell-muted);
    font-size: 12px;
    font-weight: 400;
  }
}

.att-box {
  display: grid;
  gap: 8px;
}

.att-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--mail-shell-line);
  border-radius: 8px;
  background: var(--mail-shell-rail);
}

.att-icon {
  display: flex;
  color: var(--mail-shell-muted);
}

.att-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.att-size {
  color: var(--mail-shell-muted);
  white-space: nowrap;
  font-size: 12px;
}

.reader-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-start: 32px;
}

.reply-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 104px;
  min-height: 36px;
  padding-inline: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 18px;
  color: var(--el-text-color-primary);
  cursor: pointer;

  &:hover {
    background: var(--mail-shell-hover);
  }
}

@media (max-width: 620px) {
  .box {
    padding: 4px 6px 8px;
  }

  .reader-surface {
    border-radius: 12px;
  }

  .reader {
    --avatar-size: 36px;
    --avatar-gap: 10px;
  }

  .subject-row, .reader-body, .reader-footer, .email-msg, .att {
    margin-inline-start: 0;
  }

  .envelope {
    grid-template-columns: var(--avatar-size) minmax(0, 1fr);
  }

  .envelope-actions {
    grid-column: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>

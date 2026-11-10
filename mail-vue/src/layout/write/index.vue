<template>
  <div class="send" :class="{ 'send-expanded': expanded }" v-show="show">
    <div class="write-box" :class="{ 'write-expanded': expanded }" role="region" :aria-label="$t('mailNewMessage')">
      <div class="title">
        <span class="title-text">{{ $t(form.sendType === 'reply' ? 'reply' : form.sendType === 'forward' ? 'forward' : 'mailNewMessage') }}</span>
        <div class="window-actions">
          <ToolbarButton :icon="expanded ? 'minimize' : 'maximize'"
                         :label="$t(expanded ? 'mailRestoreComposer' : 'mailExpandComposer')" @click="expanded = !expanded" />
          <ToolbarButton class="mail-window-close" icon="close" :label="$t('closeComposer')" @click="close" />
        </div>
      </div>
      <div class="container">
        <div class="compose-fields">
          <div class="compose-field compose-from">
            <span class="compose-label">{{ fieldLabel('from') }}</span>
            <el-select v-if="senderOptions.length > 1" suffix-icon="MailChevronDown" :model-value="form.accountId" :aria-label="$t('mailSenderAddress')"
                       placement="bottom-start" :show-arrow="false" :offset="5" fit-input-width
                       @change="chooseSender">
              <el-option v-for="item in senderOptions" :key="item.accountId" :label="item.email" :value="item.accountId" />
            </el-select>
            <span v-else class="compose-address">{{ form.sendEmail }}</span>
          </div>
          <div class="compose-field">
            <span class="compose-label">{{ fieldLabel('recipient') }}</span>
            <el-input-tag @add-tag="addTagChange" tag-type="primary"
                          size="default" v-model="form.receiveEmail" :aria-label="$t('recipient')">
              <template #suffix>
                <div class="recipient-tools">
                  <button v-if="!showCc" type="button" @click.stop="showCc = true">{{ $t('mailCc') }}</button>
                  <button v-if="!showBcc" type="button" @click.stop="showBcc = true">{{ $t('mailBcc') }}</button>
                </div>
              </template>
            </el-input-tag>
          </div>
          <div v-if="showCc" class="compose-field">
            <span class="compose-label">{{ fieldLabel('mailCc') }}</span>
            <el-input-tag v-model="form.cc" :aria-label="$t('mailCc')" />
          </div>
          <div v-if="showBcc" class="compose-field">
            <span class="compose-label">{{ fieldLabel('mailBcc') }}</span>
            <el-input-tag v-model="form.bcc" :aria-label="$t('mailBcc')" />
          </div>
          <div class="compose-field">
            <span class="compose-label">{{ fieldLabel('subject') }}</span>
            <el-input v-model="form.subject" :aria-label="t('subject')" />
          </div>
        </div>
        <tinyEditor :def-value="defValue" :content-gutter="composeGutter" ref="editor"
                    @change="change" compact />
        <div class="button-item">
          <div class="toolbar-group">
            <ToolbarButton icon="attach" :label="$t('addAttachment')" @click="chooseFile" />
            <ToolbarButton icon="clear" :label="$t('clearMessageContent')" @click="clearContent" />
          </div>
          <div class="att-list">
            <div class="att-item" v-for="(item,index) in form.attachments" :key="index">
              <NavigationIcon :name="getIconByName(item.filename)" :size="22" />
              <span class="att-filename">{{ item.filename }}</span>
              <span class="att-size">{{ formatBytes(item.size) }}</span>
              <ToolbarButton class="remove-attachment" icon="close"
                             :label="$t('delete') + ' · ' + item.filename" @click="delAtt(index)" />
            </div>
          </div>
          <div class="send-actions">
            <el-dropdown split-button type="primary" trigger="click" @click="sendEmail" @command="selectSendMode">
              {{ sendButtonLabel }}
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="together">
                    {{ $t(form.sendType === 'forward' ? 'forward' : 'send') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="divide" :disabled="!!(form.cc.length || form.bcc.length)">
                    {{ separateSendLabel }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <ToolbarButton class="discard-button" icon="delete" :label="$t('mailDiscardDraft')" @click="discardComposer" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import ToolbarButton from '@/components/toolbar-button/index.vue'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import tinyEditor from '@/components/tiny-editor/index.vue'
import {h, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, computed} from "vue";
import {useUserStore} from "@/store/user.js";
import {emailSend} from "@/request/email.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {fileToBase64, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import sendPercent from "@/components/send-percent/index.vue"
import {toOssDomain} from "@/utils/convert.js";
import {formatDetailDate} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {userDraftStore} from "@/store/draft.js";
import { removeDrafts, saveDraft } from '@/db/drafts.js'
import dayjs from "dayjs";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import {ElMessageBox} from "element-plus";

defineExpose({
  open,
  openReply,
  openForward,
  openDraft
})

const { t, locale } = useI18n()
const composeGutter = '16px'
const fieldLabel = key => t(key) + (locale.value === 'zh' ? '：' : ':')
const draftStore = userDraftStore()
const settingStore = useSettingStore()
const emailStore = useEmailStore();
const accountStore = useAccountStore()
const editor = ref({})
const userStore = useUserStore();
const show = ref(false);
const expanded = ref(false)
const showCc = ref(false)
const showBcc = ref(false)
const percent = ref(0)
let percentMessage = null
let sending = false
const defValue = ref('')
const backReply = reactive({
  receiveEmail: [],
  subject: '',
  content: '',
  sendType: ''
})
const form = reactive({
  sendEmail: '',
  receiveEmail: [],
  cc: [],
  bcc: [],
  accountId: -1,
  name: '',
  subject: '',
  content: '',
  sendType: '',
  manyType: 'together',
  text: '',
  emailId: 0,
  attachments: [],
  draftId: null,
})

const senderOptions = computed(() => {
  const items = [userStore.user.account, accountStore.currentAccount, ...accountStore.mailboxes]
  return [...new Map(items.filter(item => item?.accountId).map(item => [item.accountId, item])).values()]
})

function chooseSender(id) {
  const account = senderOptions.value.find(item => item.accountId === id)
  if (account) {
    form.accountId = account.accountId
    form.sendEmail = account.email
    form.name = account.name
  }
}

const separateSendLabel = computed(() => t(form.sendType === 'forward' ? 'separateForward' : 'separateSend'))
const sendButtonLabel = computed(() => {
  if (form.manyType === 'divide') return separateSendLabel.value
  if (form.sendType === 'reply') return t('reply')
  if (form.sendType === 'forward') return t('forward')
  return t('send')
})

function selectSendMode(mode) {
  form.manyType = mode
}

function addTagChange(val) {

  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  form.receiveEmail.splice(form.receiveEmail.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !form.receiveEmail.includes(email)) {
      form.receiveEmail.push(email)
    }
  })
}

function clearContent() {
  ElMessageBox.confirm(t('clearContentConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    resetForm()
  })

}

function delAtt(index) {
  form.attachments.splice(index, 1);
}

function chooseFile() {
  const doc = document.createElement("input")
  doc.setAttribute("type", "file")
  doc.multiple = true;
  doc.click()
  doc.onchange = async (e) => {

    const fileList = e.target.files;

    for (const file of fileList) {

      const size = file.size
      const filename = file.name
      const contentType = file.type

      const content = await fileToBase64(file)
      form.attachments.push({content, filename, size, contentType})

    }

  }
}

async function sendEmail() {

  if (form.receiveEmail.length === 0) {
    ElMessage({
      message: t('emptyRecipientMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.subject) {
    ElMessage({
      message: t('emptySubjectMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if ([...form.cc, ...form.bcc].some(address => !isEmail(address))) {
    ElMessage.error(t('notEmailMsg'))
    return
  }
  if (form.cc.length || form.bcc.length) form.manyType = 'together'

  form.content = editor.value.getContent();

  if (!form.content) {
    ElMessage({
      message: t('emptyContentMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (sending) {
    ElMessage({
      message: t('sendingErrorMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  percentMessage = ElMessage({
    message: () => h(sendPercent, {value: percent.value, desc: t('sending')}),
    dangerouslyUseHTMLString: true,
    plain: true,
    duration: 0,
    customClass: 'message-bottom'
  })

  sending = true

  show.value = false

  emailSend(form, (e) => {
    percent.value = Math.round((e.loaded * 98) / e.total)
  }).then(async result => {
    const emailList = Array.isArray(result) ? result : result.emails
    const email = emailList[0]
    emailStore.workspaceRevision++

    userStore.refreshUserInfo();

    if (result.failedRecipients?.length) {
      form.receiveEmail = result.failedRecipients
      show.value = true
      ElNotification({
        title: t('partialSendMsg', {count: emailList.length, failed: result.failedRecipients.length}),
        type: 'warning',
        message: result.error,
        position: 'bottom-right'
      })
      return
    }

    ElNotification({
      title: t('sendSuccessMsg'),
      type: "success",
      message: h('span', {style: 'color: teal'}, email.subject),
      position: 'bottom-right'
    })

    if (form.draftId) {
      try {
        await removeDrafts([form.draftId])
        draftStore.refreshList++
      } catch {
        ElMessage.error(t('mailSaveDraftFailed'))
      }
    }

    show.value = false
    resetForm();
  }).catch((e) => {
    ElNotification({
      title: t('sendFailMsg'),
      type: e.code === 403 ? 'warning' : 'error',
      message: h('span', {style: 'color: teal'}, e.message),
      position: 'bottom-right'
    })
    if (e.code === 401) {
      localStorage.removeItem('token');
      router.replace('/login');
    }
    show.value = true
  }).finally(() => {
    percentMessage.close()
    percent.value = 0
    sending = false
  })
}

function resetForm() {
  form.receiveEmail = []
  form.cc = []
  form.bcc = []
  form.subject = ''
  form.content = ''
  form.text = ''
  form.manyType = 'together'
  form.attachments = []
  form.sendType = ''
  form.emailId = 0
  form.draftId = null
  showCc.value = false
  showBcc.value = false
  expanded.value = false
  backReply.content = ''
  backReply.subject = ''
  backReply.receiveEmail = []
  backReply.sendType = ''
  editor.value.clearEditor()
}

function change(content, text) {
  form.content = content;
  form.text = text
}

function openForward(email) {
  if (show.value) return editor.value.focus()
  resetForm();

  email.subject = email.subject || ''

  form.subject = email.subject
  form.sendType = 'forward'

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
      ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
    `
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })

  });
}

function openReply(email) {
  if (show.value) return editor.value.focus()
  resetForm();

  email.subject = email.subject || ''

  form.receiveEmail.push(email.sendEmail)
  form.subject = (
      email.subject.startsWith('Re:') ||
      email.subject.startsWith('Re：') ||
      email.subject.startsWith('回复：') ||
      email.subject.startsWith('回复:')) ? email.subject : 'Re: ' + email.subject
  form.sendType = 'reply'
  form.emailId = email.emailId

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
    <div></div>
    <div>
    <br>
        ${formatDetailDate(email.createTime)} ${email.name} &lt${email.sendEmail}&gt ${t('wrote')}:
    </div>
    <blockquote class="mceNonEditable" style="margin: 0 0 0 0.8ex;border-left: 1px solid rgb(204,204,204);padding-left: 1ex;">
      <articl>
          ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
      </article>
    </blockquote>`
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })
  })

}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function open() {
  if (show.value) {
    editor.value.focus()
    return
  }
  if (!accountStore.currentAccount.email) {
    form.sendEmail = userStore.user.email;
    form.accountId = userStore.user.account.accountId;
    form.name = userStore.user.name;
  } else {
    form.sendEmail = accountStore.currentAccount.email;
    form.accountId = accountStore.currentAccount.accountId;
    form.name = accountStore.currentAccount.name;
  }
  show.value = true;
  editor.value.focus()
}

function openDraft(draft) {
  if (show.value) {
    editor.value.focus()
    return
  }
  Object.assign(form, { ...draft, cc: draft.cc || [], bcc: draft.bcc || [], manyType: draft.manyType || 'together' })
  showCc.value = !!form.cc.length
  showBcc.value = !!form.bcc.length
  defValue.value = ''
  setTimeout(() => defValue.value = form.content)
  show.value = true;
  editor.value.focus()
}

const handleKeyDown = (event) => {
  if (event.key !== 'Escape' || event.defaultPrevented || !show.value) return
  const fromPopup = event.composedPath().some(node =>
    node.matches?.('.el-overlay, .el-popper, .tox-tinymce-aux, .tox-dialog'))
  if (!fromPopup) close()
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

function hasDraftContent() {
  return !!(form.content || form.subject || form.receiveEmail.length || form.cc.length || form.bcc.length || form.attachments.length)
}

async function discardComposer() {
  try {
    if (hasDraftContent() || form.draftId) {
      await ElMessageBox.confirm(t('mailDiscardDraftConfirm'), {
        confirmButtonText: t('mailDiscardDraft'), cancelButtonText: t('cancel'), type: 'warning',
      })
    }
    if (form.draftId) {
      await removeDrafts([form.draftId])
      draftStore.refreshList++
    }
    show.value = false
    resetForm()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(t('mailSaveDraftFailed'))
  }
}

async function close() {
  if (!show.value || sending) return


  if (!form.content) {
    form.content = editor.value.getContent() || ''
  }

  if (form.draftId) {
    try {
      if (hasDraftContent()) await saveDraft(toRaw(form), form.draftId)
      else await removeDrafts([form.draftId])
      draftStore.refreshList++
      show.value = false
      resetForm()
    } catch {
      ElMessage.error(t('mailSaveDraftFailed'))
    }
    return;
  }

  if (!hasDraftContent()) {
    show.value = false
    resetForm()
    return;
  }

  if (backReply.sendType === 'reply' || backReply.sendType === 'forward') {
    let subjectFlag = form.subject === backReply.subject
    let contentFlag = editor.value.getContent() === backReply.content
    let receiveFlag = form.receiveEmail.length === 1 && form.receiveEmail[0] === backReply.receiveEmail[0]
    if (backReply.sendType === 'forward' && form.receiveEmail.length === 0) {
      receiveFlag = true;
    }
    if (subjectFlag && contentFlag && receiveFlag && !form.cc.length && !form.bcc.length && !form.attachments.length) {
      resetForm();
      close()
      return;
    }
  }

  ElMessageBox.confirm(t('saveDraftConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning',
    distinguishCancelAndClose: true
  }).then(async () => {
    await saveDraft({ ...toRaw(form), createTime: dayjs().utc().format('YYYY-MM-DD HH:mm:ss') })
    draftStore.refreshList++
    show.value = false
    await nextTick(() => {
      resetForm()
    })
  }).catch((action) => {
    if (action === 'cancel') {
      show.value = false
      resetForm()
    } else if (action !== 'close') {
      ElMessage.error(t('mailSaveDraftFailed'))
    }
  })

}

</script>
<style scoped lang="scss">
.send {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px 22px 22px;
}

.send-expanded {
  align-items: center;
  justify-content: center;
  padding-block: 18px;
}

.write-box {
  --compose-gutter: v-bind(composeGutter);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(640px, 100%);
  height: min(560px, max(380px, 56dvh));
  overflow: hidden;
  border: 1px solid var(--mac-line);
  border-radius: var(--mail-radius-surface);
  background: var(--mac-surface);
  box-shadow: var(--mac-shadow-window);
  pointer-events: auto;
}

.write-box.write-expanded {
  width: min(1060px, calc(100vw - 44px));
  height: min(800px, calc(100dvh - 36px));
}

.title, .window-actions, .recipient-tools {
  display: flex;
  align-items: center;
}

.title {
  min-height: 44px;
  justify-content: space-between;
  padding: 0 8px 0 var(--compose-gutter);
  border-bottom: 1px solid var(--mac-line);
  color: var(--mac-text);
  background: var(--mac-chrome);
  font-size: var(--mac-fs-chrome);
  line-height: var(--mac-lh-chrome);
  font-weight: 600;
}

.window-actions {
  gap: 4px;
}
.window-actions .toolbar-button { width: 28px; height: 28px; flex-basis: 28px; border-radius: var(--mail-radius-close); }

.container {
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.compose-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-height: 40px;
  padding-inline: var(--compose-gutter) 8px;
  border-bottom: 1px solid var(--mac-line);
  font-size: var(--mac-fs-body);
  line-height: var(--mac-lh-body);
}

.compose-fields { max-height: 36vh; overflow: auto; }

.compose-from :deep(.el-select) { width: min(260px, 100%); min-width: 0; }
.compose-from :deep(.el-select__wrapper) { padding: 0 8px 0 0; box-shadow: none; }
.compose-label { color: var(--mac-text); font-weight: 600; text-align: start; white-space: nowrap; }
.compose-address { color: var(--mac-text); }
.compose-field :deep(.el-input__wrapper),
.compose-field :deep(.el-input-tag) { box-shadow: none; padding-inline: 0; min-width: 0; }
.compose-field:focus-within { box-shadow: inset 0 -2px var(--mac-focus); }

.recipient-tools { gap: 3px; }
.recipient-tools button {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--mac-text-2);
  font-size: var(--mac-fs-chrome);
  cursor: pointer;
}
.recipient-tools button:hover { background: var(--mac-hover); color: var(--mac-text); }

.button-item {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px 8px var(--compose-gutter);
  border-top: 1px solid var(--mac-line);
  background: var(--mac-chrome);
}

.send-actions { grid-column: 1; grid-row: 1; }
.button-item .toolbar-group { grid-column: 2; grid-row: 1; }
.discard-button { grid-column: 4; grid-row: 1; }
.att-list {
  grid-column: 3;
  display: grid;
  gap: 4px;
  max-height: 66px;
  overflow-y: auto;
}

.att-item {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 5px;
  align-items: center;
  padding: 2px 4px 2px 8px;
  border: 1px solid var(--mac-line);
  background: var(--mac-surface);
  border-radius: 6px;
  font-size: var(--mac-fs-caption);
}

.att-filename { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.att-size { font-size: 11px; color: var(--mail-shell-muted); }

@media (max-width: 767px) {
  .send { padding: 0; }
  .write-box, .write-box.write-expanded {
    width: 100%;
    height: min(100%, 660px);
    min-width: 0;
  }
  .att-list:not(:empty) { grid-row: 2; grid-column: 1 / -1; }
}
.toolbar-button.remove-attachment {
  flex-basis: 26px;
  width: 26px;
  height: 26px;
}

:deep(.el-input-tag__suffix) {
  padding-right: 4px;
}

.icon {
  cursor: pointer;
}
</style>

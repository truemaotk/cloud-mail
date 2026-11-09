<template>
  <div class="account-box">
    <div class="head-opt">
      <h2>{{ $t('account') }}</h2>
      <ToolbarButton v-perm="'account:add'" icon="add" :label="$t('addAccount')" @click="add" />
      <ToolbarButton icon="refresh" :label="$t('refreshMail')" @click="refresh" />
    </div>
    <el-scrollbar class="scrollbar" ref="scrollbarRef">
      <div v-infinite-scroll="getAccountList" :infinite-scroll-distance="600" :infinite-scroll-immediate="false">
        <el-card shadow="never" class="item" :class="itemBg(item.accountId)" v-for="(item, index) in accounts" :key="item.accountId"
                 @click="changeAccount(item)">
          <button class="account" type="button"
                  :aria-pressed="accountStore.currentAccountId === item.accountId"
                  @click.stop="changeAccount(item)">
            <span class="account-address" :title="item.email">{{ item.email }}</span>
            <UnreadBadge :count="emailStore.unreadByAccount[item.accountId]" />
          </button>
          <div class="account-actions">
            <button
              type="button"
              class="account-action account-receive"
              :aria-pressed="!!item.allReceive"
              :title="$t('receiveAllMail')"
              :aria-label="$t('receiveAllMail')"
              @click.stop="setAllReceive(item)"
            >
              <NavigationIcon :name="item.allReceive ? 'folder' : 'mail'" />
            </button>
            <button type="button" class="account-action" :title="$t('copy')" :aria-label="$t('copy')" @click.stop="copyAccount(item.email)">
              <NavigationIcon name="copy" />
            </button>
            <el-dropdown
              v-if="!showNullSetting(item)"
              trigger="click"
              placement="bottom-end"
              :show-arrow="false"
              :offset="7"
            >
              <button type="button" class="account-action" :title="$t('mailboxSettings')" :aria-label="$t('mailboxSettings')" @click.stop>
                <NavigationIcon name="settings" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="hasPerm('email:send')" @click="openSetName(item)">
                    <NavigationIcon name="compose" />{{ $t('rename') }}
                  </el-dropdown-item>
                  <el-dropdown-item v-if="item.accountId !== userStore.user.account.accountId" @click="setAsTop(item, index)">
                    <NavigationIcon name="pin" />{{ $t('pin') }}
                  </el-dropdown-item>
                  <el-dropdown-item v-if="item.accountId !== userStore.user.account.accountId && hasPerm('account:delete')"
                                    @click="remove(item)">
                    <NavigationIcon name="delete" />{{ $t('delete') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-card>

        <!-- Initial Loading Skeleton -->
        <template v-if="loading">
          <el-skeleton v-for="i in skeletonRows" :key="i" animated>
            <template #template>
              <el-card class="item">
                <el-skeleton-item variant="text" class="account-skeleton-address" />
                <div class="account-skeleton-actions">
                  <el-skeleton-item v-for="icon in 3" :key="icon" variant="text" />
                </div>
              </el-card>
            </template>
          </el-skeleton>
        </template>

        <!-- Follow Loading Skeleton -->
        <template v-if="accounts.length > 0 && !noLoading">
          <el-skeleton animated>
            <template #template>
              <el-card class="item">
                <el-skeleton-item variant="text" class="account-skeleton-address" />
                <div class="account-skeleton-actions">
                  <el-skeleton-item v-for="icon in 3" :key="icon" variant="text" />
                </div>
              </el-card>
            </template>
          </el-skeleton>
        </template>

        <div class="empty" v-if="noLoading && accounts.length === 0">
          <el-empty :image-size="52" :description="$t('noMailboxes')">
            <template #image>
              <span class="mail-empty-icon"><NavigationIcon name="mailbox" :size="25" /></span>
            </template>
          </el-empty>
        </div>
      </div>

    </el-scrollbar>
    <el-dialog close-icon="MailCloseIcon" v-model="showAdd" :title="$t('addAccount')">
      <div class="container">
        <el-input
          ref="addRef"
          v-model="addForm.email"
          class="mail-address-input"
          :aria-label="$t('emailAccount')"
          :placeholder="$t(domainList.length ? 'loginEmailPrefix' : 'emailAccount')"
          autocomplete="off"
          autocapitalize="none"
          :spellcheck="false"
          @keyup.enter="submit"
        >
          <template v-if="domainList.length" #append>
            <el-select suffix-icon="MailChevronDown"
              v-if="domainList.length > 1"
              v-model="addForm.suffix"
              :aria-label="$t('loginEmailDomain')"
              class="mail-address-domain-select"
            >
              <el-option v-for="domain in domainList" :key="domain" :label="domain" :value="domain" />
            </el-select>
            <span v-else class="mail-address-domain" :title="addForm.suffix">{{ addForm.suffix }}</span>
          </template>
        </el-input>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading"
        >{{ $t('add') }}
        </el-button>
      </div>
      <div
          ref="turnstileContainer"
          :key="turnstileContainerKey"
          class="add-email-turnstile"
          :class="verifyShow ? 'turnstile-show' : 'turnstile-hide'"
          :data-sitekey="settingStore.settings.siteKey"
          data-callback="onTurnstileSuccess"
          data-error-callback="onTurnstileError"
      >
        <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed', {action: $t('add')}) }}</span>
      </div>
    </el-dialog>
    <el-dialog close-icon="MailCloseIcon" v-model="setNameShow" :title="$t('changeUserName')">
      <div class="container">
        <el-input v-model="accountName" type="text" :placeholder="$t('username')" autocomplete="off" @keyup.enter="setName">
        </el-input>
        <el-button class="btn" type="primary" @click="setName" :loading="setNameLoading"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import ToolbarButton from '@/components/toolbar-button/index.vue'
import {computed, nextTick, reactive, ref, watch} from "vue";
import {
  accountList,
  accountAdd,
  accountDelete,
  accountSetName,
  accountSetAllReceive,
  accountSetAsTop
} from "@/request/account.js";
import {sleep} from "@/utils/time-utils.js"
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import NavigationIcon from '@/components/navigation-icon/index.vue'
import UnreadBadge from '@/components/unread-badge/index.vue'
import {useEmailStore} from "@/store/email.js";
import {useUserStore} from "@/store/user.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {AccountAllReceiveEnum} from "@/enums/account-enum.js";
import {reloadTurnstileScript} from "@/utils/turnstile-script.js";

const {t} = useI18n();
const userStore = useUserStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const emailStore = useEmailStore();
const showAdd = ref(false)
const addLoading = ref(false);
const domainList = computed(() => settingStore.domainList)
const accounts = reactive([])
const noLoading = ref(false)
const loading = ref(false)
const followLoading = ref(false);
const verifyShow = ref(false)
const setNameShow = ref(false)
const setNameLoading = ref(false)
const accountName = ref(null)
const addRef = ref({})
const scrollbarRef = ref({})
let account = null
let turnstileId = null
const botJsError = ref(false)
let verifyToken = ''
let verifyErrorCount = 0
let turnstileRecoveryAttempted = false
const turnstileContainer = ref(null)
const turnstileContainerKey = ref(0)
let first = true
const addForm = reactive({
  email: '',
  suffix: ''
})
let skeletonRows = 10
const queryParams = {
  size: 30
}

if (hasPerm('account:query')) {
  getAccountList()
}

watch(() => accountStore.changeUserAccountName, () => {
  accounts[0].name = accountStore.changeUserAccountName
})

watch(domainList, (list) => {
  if (!list.includes(addForm.suffix)) {
    addForm.suffix = list[0] ?? ''
  }
}, {immediate: true})

async function recoverTurnstile() {
  if (turnstileRecoveryAttempted) return
  turnstileRecoveryAttempted = true
  botJsError.value = false
  verifyToken = ''
  turnstileId = null
  turnstileContainerKey.value++
  try {
    const api = await reloadTurnstileScript()
    await nextTick()
    if (!showAdd.value || !turnstileContainer.value) return
    turnstileId = api.render(turnstileContainer.value)
  } catch (error) {
    botJsError.value = true
    console.warn('Turnstile recovery failed', error)
  } finally {
    turnstileRecoveryAttempted = false
  }
}

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.add-email-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

function getSkeletonRows() {
  if (accounts.length > 20) return skeletonRows = 20
  if (accounts.length === 0) return skeletonRows = 1
  skeletonRows = accounts.length
}

function setName() {

  if (setNameLoading.value) return

  let name = accountName.value

  if (name === account.name) {
    setNameShow.value = false
    return
  }

  if (!name) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameLoading.value = true
  accountSetName(account.accountId, name).then(() => {
    account.name = name
    setNameShow.value = false

    if (account.accountId === userStore.user.account.accountId) {
      userStore.user.name = name
    }

    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  }).finally(() => {
    setNameLoading.value = false
  })
}

function openSetName(accountItem) {
  accountName.value = accountItem.name
  account = accountItem
  setNameShow.value = true
}

function setAllReceive(account) {
  let allReceiveAccount = accounts.find(account => account.allReceive === AccountAllReceiveEnum.ENABLED);
  if (allReceiveAccount && allReceiveAccount.accountId !== account.accountId) allReceiveAccount.allReceive = AccountAllReceiveEnum.DISABLED;
  account.allReceive = account.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
  changeAccount(account);
  accountSetAllReceive(account.accountId).catch(() => {
    account.allReceive = account.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
    if (allReceiveAccount) allReceiveAccount.allReceive = AccountAllReceiveEnum.ENABLED;
  }).then(() => {
    if (account.allReceive === AccountAllReceiveEnum.ENABLED) {
      ElMessage({
        message: t('setSuccess'),
        type: 'success',
        plain: true,
      })
    }
    emailStore.emailScroll?.refreshList();
    emailStore.sendScroll?.refreshList();
  })
}


function showNullSetting(item) {
  return !hasPerm('email:send') && !(item.accountId !== userStore.user.account.accountId && hasPerm('account:delete'))
}

function itemBg(accountId) {
  return accountStore.currentAccountId === accountId ? 'item-choose' : ''
}



function remove(account) {
  ElMessageBox.confirm(t('delConfirm', {msg: account.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    accountDelete(account.accountId).then(() => {
      emailStore.refreshUnreadCounts()
      const index = accounts.findIndex(item => item.accountId === account.accountId);
      accounts.splice(index, 1);
      if (accounts.length < queryParams.size) {
        getAccountList()
      }
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  });
}

function refresh() {
  if (loading.value) {
    return
  }
  emailStore.refreshUnreadCounts()
  loading.value = false
  followLoading.value = false
  noLoading.value = false
  queryParams.accountId = 0
  queryParams.lastSort = null
  getSkeletonRows();
  scrollbarRef.value.setScrollTop(0)
  accounts.splice(0, accounts.length)
  getAccountList()
}

function changeAccount(account) {
  accountStore.currentAccountId = account.accountId
  accountStore.currentAccount = account
}

function add() {
  showAdd.value = true
  setTimeout(() => {
    addRef.value.focus()
  }, 100)
}

function setAsTop(account, index) {
  accountSetAsTop(account.accountId).then(() => {
    ElMessage({
      message: t('setSuccess'),
      type: 'success',
      plain: true,
    })

    const [item] = accounts.splice(index, 1);
    accounts.splice(1, 0, item);

  });
}

async function copyAccount(account) {
  try {
    await navigator.clipboard.writeText(account);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true,
    })
  }
}

function getAccountList() {

  if (loading.value || followLoading.value || noLoading.value) return;

  if (accounts.length === 0) {
    loading.value = true
  } else {
    followLoading.value = true
  }

  let start = Date.now();

  const accountId = accounts.length > 0 ? accounts.at(-1).accountId : 0;
  const lastSort = accounts.length > 0 ? accounts.at(-1).sort : null;

  accountList(accountId, queryParams.size, lastSort).then(async list => {

    let end = Date.now();
    let duration = end - start;
    if (duration < 300) {
      await sleep(300 - duration)
    }

    if (list.length < queryParams.size) {
      noLoading.value = true
    }
    if (accounts.length === 0) {
      accountStore.currentAccount = list[0]
    }

    accounts.push(...list)

    loading.value = false
    followLoading.value = false
    first = false
  }).catch(() => {
    loading.value = false
    followLoading.value = false
  })
}


function submit() {

  if (addLoading.value) return

  if (!addForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (addForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const address = addForm.email + addForm.suffix
  if (!isEmail(address)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!verifyToken && (settingStore.settings.addEmailVerify === 0 || (settingStore.settings.addEmailVerify === 2 && settingStore.settings.addVerifyOpen))) {
    if (turnstileRecoveryAttempted) return
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.add-email-turnstile')
          } catch (e) {
            botJsError.value = true
            console.log('人机验证js加载失败')
            recoverTurnstile()
          }
        } else {
          window.turnstile.reset('.add-email-turnstile')
        }
      })
    } else if (botJsError.value) {
      recoverTurnstile()
    } else {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      })
    }
    return;
  }

  addLoading.value = true
  accountAdd(address, verifyToken).then(account => {
    addLoading.value = false
    addForm.email = ''
    accounts.push(account)
    verifyToken = ''
    settingStore.settings.addVerifyOpen = account.addVerifyOpen
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    verifyShow.value = false
    showAdd.value = false
    userStore.refreshUserInfo()
  }).catch(res => {
    if (res.code === 400) {
      verifyToken = ''
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.add-email-turnstile')
        })
      }
      verifyShow.value = true
    }
    addLoading.value = false
  })
}
</script>
<style>
path[fill="#ffdda1"] {
  fill: #ffdd7d;
}
</style>
<style scoped lang="scss">
.account-box {

  border-right: 1px solid var(--mail-shell-line);
  background-color: var(--mail-shell-rail);
  height: 100%;
  overflow: hidden;

  .head-opt {
    display: flex;
    align-items: center;
    gap: 3px;
    height: var(--mail-shell-toolbar);
    border-bottom: 1px solid var(--mail-shell-line);
    padding: 0 12px 0 16px;

    h2 {
      flex: 1;
      font-size: 13px;
      font-weight: 650;
    }
  }

  .account-action {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--mail-radius-control);
    color: var(--mail-shell-muted);
    cursor: pointer;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: var(--mail-shell-hover);
      color: var(--el-text-color-primary);
    }

    &[aria-pressed="true"] {
      background: var(--mail-shell-hover);
      color: var(--el-text-color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--mail-shell-muted);
      outline-offset: -2px;
    }
  }

  .scrollbar {
    width: 100%;
    height: calc(100% - var(--mail-shell-toolbar));
    @media (max-width: 767px) {
      height: calc(100% - var(--mail-shell-toolbar) - var(--mail-shell-header));
    }

    .empty {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

  }

  .btn {
    width: 100%;
    margin-top: 15px;
  }

  .item {
    position: relative;
    background-color: var(--el-bg-color);
    border-color: var(--mail-shell-line);
    border-radius: var(--mail-radius-card);
    padding: 7px 9px 8px 11px;
    margin: 0 10px 7px;
    cursor: pointer;
    transition: border-color 140ms ease;

    &:hover {
      border-color: var(--el-border-color);
    }

    .account {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      width: 100%;
      min-height: 22px;
      font-weight: 600;
      font-size: 13px;
      padding-inline: 1px;
      color: var(--el-text-color-primary);
      text-align: left;
      cursor: pointer;
    }

    .account:focus-visible {
      outline: 2px solid var(--mail-shell-muted);
      outline-offset: 2px;
      border-radius: 3px;
    }

    .account-address {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .account-actions,
    .account-skeleton-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      min-height: 26px;
      margin-top: 7px;
    }

    .account-receive,
    .account-skeleton-actions > :first-child {
      margin-inline-end: auto;
    }

    .account-skeleton-actions .el-skeleton__item {
      width: 16px;
      height: 13px;
      margin-inline: 4px;
    }

    .account-skeleton-address {
      display: block;
      width: 70%;
      height: 14px;
      margin-block: 4px;
    }

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .item:first-child {
    margin-top: 10px;
  }

  .item-choose {
    background: var(--mail-shell-active);

    &::before {
      position: absolute;
      inset: 8px auto 8px 0;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--mail-shell-marker);
      content: '';
    }
  }
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.el-pagination .el-select) {
  width: 100px;
  background: var(--el-bg-color);
}

.add-email-turnstile {
  margin-top: 15px;
}

.turnstile-show {
  opacity: 1;
}

.turnstile-hide {
  opacity: 0;
  pointer-events: none;
  position: fixed;
}

</style>

<template>
  <div class="settings-page">
    <SettingsWorkspace :sections="personalSections" v-slot="{ section }">
      <section v-show="section === 'account'" class="personal-section">
        <div class="identity-summary">
          <span class="identity-avatar" aria-hidden="true"><NavigationIcon name="user" /></span>
          <div>
            <h3>{{ userStore.user.name || userStore.user.email }}</h3>
            <p v-if="userStore.user.name">{{ userStore.user.email }}</p>
          </div>
        </div>
        <div class="preferences-list">
          <div class="settings-row">
            <span>{{ $t('username') }}</span>
            <form v-if="setNameShow" class="edit-name-form" @submit.prevent="setName">
              <el-input v-model="accountName" :aria-label="$t('username')" />
              <el-button native-type="submit" type="primary">{{ $t('save') }}</el-button>
              <el-button @click="setNameShow = false">{{ $t('cancel') }}</el-button>
            </form>
            <el-button v-else @click="showSetName">{{ $t('change') }}</el-button>
          </div>
          <div class="settings-row">
            <span>{{ $t('password') }}</span>
            <el-button @click="pwdShow = true">{{ $t('changePwdBtn') }}</el-button>
          </div>
        </div>
        <dl class="preferences-list account-limits" :aria-label="$t('profileLimits')">
          <div v-if="accountRole.name" class="settings-row">
            <dt>{{ $t('profileRole') }}</dt>
            <dd>{{ accountRole.name }}</dd>
          </div>
          <div class="settings-row">
            <dt>{{ $t('profileSendQuota') }}</dt>
            <dd>{{ sendLimit }}</dd>
          </div>
          <div class="settings-row">
            <dt>{{ $t('profileAddressQuota') }}</dt>
            <dd>{{ addressLimit }}</dd>
          </div>
        </dl>
        <div v-perm="'my:delete'" class="settings-row danger-row">
          <div>
            <h3>{{ $t('deleteUser') }}</h3>
            <p>{{ $t('delAccountMsg') }}</p>
          </div>
          <el-button @click="deleteConfirm">{{ $t('deleteUserBtn') }}</el-button>
        </div>
      </section>

      <section v-show="section === 'appearance'" class="personal-section">
        <div class="preferences-list">
          <div class="settings-row">
            <span>{{ $t('preferredLanguage') }}</span>
            <el-select suffix-icon="MailChevronDown"
              :model-value="langSelect"
              class="language-select"
              :aria-label="$t('preferredLanguage')"
              :placeholder="$t('select')"
              @change="changeLang"
            >
              <el-option label="中文" value="zh" @pointerdown.prevent.stop="changeLang('zh')" />
              <el-option label="English" value="en" @pointerdown.prevent.stop="changeLang('en')" />
            </el-select>
          </div>
          <div class="theme-section">
            <h3>{{ $t('themeStyle') }}</h3>
            <ThemeSelector />
          </div>
        </div>
      </section>

      <section v-show="section === 'notice'" class="personal-section">
        <div class="preferences-list">
          <div class="settings-row">
            <div class="notice-status">
              <NavigationIcon name="bell" />
              <p>{{ settingStore.settings.notice === 1 ? $t('noSystemNotice') : settingStore.settings.noticeTitle || $t('noticeInfo') }}</p>
            </div>
            <el-button :disabled="settingStore.settings.notice === 1" @click="uiStore.showNotice()">{{ $t('viewNotice') }}</el-button>
          </div>
        </div>
      </section>
    </SettingsWorkspace>


    <el-dialog close-icon="MailCloseIcon" v-model="pwdShow" :title="$t('changePassword')" width="min(340px, calc(100vw - 32px))" append-to-body>
      <form class="update-pwd" @submit.prevent="submitPwd">
        <el-input type="password" :placeholder="$t('newPassword')" :aria-label="$t('newPassword')" v-model="form.password" autocomplete="new-password" />
        <el-input type="password" :placeholder="$t('confirmPassword')" :aria-label="$t('confirmPassword')" v-model="form.newPwd" autocomplete="new-password" />
        <el-button type="primary" native-type="submit" :loading="setPwdLoading">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>
  </div>
</template>
<script setup>
import {computed, reactive, ref, defineOptions} from 'vue'
import {resetPassword, userDelete} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {hasPerm} from '@/perm/perm.js'
import ThemeSelector from "@/components/theme-selector/index.vue";

import SettingsWorkspace from "@/components/settings-workspace/index.vue";
import NavigationIcon from "@/components/navigation-icon/index.vue";

const personalSections = [
  { key: 'account', label: 'personalAccount', icon: 'user', description: 'personalAccountDesc' },
  { key: 'appearance', label: 'personalAppearance', icon: 'screen', description: 'personalAppearanceDesc' },
  { key: 'notice', label: 'noticeTitle', icon: 'bell', description: 'personalNoticeDesc' },
]

const { t } = useI18n()
const accountStore = useAccountStore()
const settingStore = useSettingStore()
const uiStore = useUiStore()
const userStore = useUserStore();
const setPwdLoading = ref(false)
const setNameShow = ref(false)
const accountName = ref(null)
const langSelect = ref(settingStore.lang)
const accountRole = computed(() => userStore.user.role ?? {})

const sendLimit = computed(() => {
  const { sendType, sendCount } = accountRole.value
  if (settingStore.settings.send === 1) return t('disabled')
  if (!hasPerm('email:send')) return t('unauthorized')
  if (sendType === 'ban') return t('sendBanned')
  if (sendType === 'internal') return t('sendInternal')
  if (!sendCount) return t('unlimited')
  const usage = `${userStore.user.sendCount}/${sendCount}`
  const period = { day: 'daily', count: 'total' }[sendType]
  return period ? `${usage} · ${t(period)}` : usage
})

const addressLimit = computed(() => {
  if (settingStore.settings.manyEmail || settingStore.settings.addEmail) return t('disabled')
  if (!hasPerm('account:add')) return t('unauthorized')
  const limit = accountRole.value.accountCount
  return limit ? t('totalUserAccount', { msg: limit }) : t('unlimited')
})

defineOptions({
  name: 'setting'
})

function showSetName() {
  accountName.value = userStore.user.name
  setNameShow.value = true
}

function setName() {

  if (!accountName.value) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameShow.value = false
  let name = accountName.value

  if (name === userStore.user.name) {
    return
  }

  userStore.user.name = accountName.value

  accountSetName(userStore.user.account.accountId,name).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })

    accountStore.changeUserAccountName = name

  }).catch(() => {
    userStore.user.name = name
  })
}

function changeLang(lang) {
  let setting = {}
  try {
    setting = JSON.parse(localStorage.getItem('setting') || '{}')
  } catch (e) {
    setting = {}
  }
  localStorage.setItem('setting', JSON.stringify({...setting, lang}))
  window.location.reload()
}

const pwdShow = ref(false)
const form = reactive({
  password: '',
  newPwd: '',
})

const deleteConfirm = () => {
  ElMessageBox.confirm(t('delAccountConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete().then(() => {
      localStorage.removeItem('token');
      router.replace('/login');
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  })
}


function submitPwd() {

  if (setPwdLoading.value) return

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password !== form.newPwd) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  setPwdLoading.value = true
  resetPassword(form.password).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })
    pwdShow.value = false
    setPwdLoading.value = false
    form.password = ''
    form.newPwd = ''
  }).catch(() => {
    setPwdLoading.value = false
  })

}

</script>
<style scoped>
.settings-page {
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.personal-section {
  display: grid;
  gap: 18px;
}

.identity-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--mail-shell-line);
  border-radius: 8px;
  background: var(--mail-shell-rail);
  overflow-wrap: anywhere;
}

.identity-avatar {
  display: grid;
  flex: 0 0 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--mail-shell-line);
  border-radius: 50%;
  background: var(--el-bg-color);
  color: var(--mail-shell-muted);
}

.identity-avatar svg {
  width: 20px;
  height: 20px;
}

.identity-summary h3 {
  font-size: 16px;
  font-weight: 650;
}

.identity-summary p,
.danger-row p {
  margin-top: 4px;
  color: var(--mail-shell-muted);
  font-size: 13px;
}

.preferences-list,
.danger-row {
  border: 1px solid var(--mail-shell-line);
  border-radius: 8px;
}

.account-limits dd {
  margin: 0;
  color: var(--mail-shell-muted);
  text-align: end;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 54px;
  padding: 11px 16px;
  font-size: 14px;
}

.settings-row + .settings-row,
.theme-section {
  border-top: 1px solid var(--mail-shell-line);
}

.settings-row > span,
.personal-section h3 {
  font-weight: 650;
}

.edit-name-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.edit-name-form .el-input {
  flex: 1 1 130px;
  width: 175px;
  max-width: 100%;
}

.edit-name-form .el-button + .el-button {
  margin-left: 0;
}

.language-select {
  width: 144px;
}

.theme-section {
  padding: 15px 16px 16px;
}

.theme-section h3 {
  margin-bottom: 10px;
  font-size: 14px;
}

.notice-status {
  display: flex;
  align-items: center;
  gap: 9px;
  overflow-wrap: anywhere;
}

.notice-status svg {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  color: var(--mail-shell-muted);
}

.update-pwd {
  display: grid;
  gap: 12px;
}

@media (max-width: 540px) {
  .settings-row:has(.edit-name-form),
  .danger-row {
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
  }

  .edit-name-form {
    justify-content: flex-start;
  }
}
</style>

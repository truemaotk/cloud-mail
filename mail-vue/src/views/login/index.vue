<template>
  <div
    id="login-box"
    :class="{ 'is-dark': uiStore.dark, 'has-custom-background': background }"
    v-loading="oauthLoading"
    :element-loading-text="$t('loginBtn')"
  >
    <div v-if="background" class="login-background" :style="background" aria-hidden="true"></div>

    <div class="login-shell">
      <div v-if="!background" class="login-scene" aria-hidden="true">
        <div class="login-scene-inner">
          <svg class="login-illustration" viewBox="0 0 480 304" fill="none" focusable="false">
            <defs>
              <pattern id="mail-signin-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" stroke="var(--login-line)" stroke-width="1" />
              </pattern>
            </defs>
            <rect x="12" y="12" width="456" height="280" rx="16" fill="url(#mail-signin-grid)" stroke="var(--login-line)" />
            <path d="M44 235h37a17 17 0 0 0 17-17v-36a17 17 0 0 1 17-17h34M330 130h43a17 17 0 0 0 17-17V78h39" stroke="var(--login-muted)" stroke-width="1.3" stroke-dasharray="3 6" />
            <circle cx="44" cy="235" r="4" fill="var(--login-action)" />
            <circle cx="429" cy="78" r="4" fill="var(--login-action)" />
            <rect x="137" y="137" width="226" height="129" rx="17" fill="var(--login-line)" transform="rotate(-7 250 201)" />
            <g transform="rotate(9 249 126)">
              <rect x="168" y="51" width="162" height="150" rx="12" fill="var(--login-line)" />
            </g>
            <g transform="rotate(-7 240 152)">
              <rect x="153" y="53" width="166" height="149" rx="12" fill="var(--login-surface)" stroke="var(--login-line)" stroke-width="1.5" />
              <path d="M175 79h48m-48 17h112m-112 16h86" stroke="var(--login-line)" stroke-width="4" stroke-linecap="round" />
              <rect x="121" y="125" width="226" height="129" rx="17" fill="var(--login-action)" />
              <path d="m133 141 90 62a19 19 0 0 0 22 0l90-62" stroke="var(--login-action-ink)" stroke-opacity=".68" stroke-width="1.6" stroke-linecap="round" />
              <path d="m133 239 61-53m141 53-61-53" stroke="var(--login-action-ink)" stroke-opacity=".3" stroke-width="1.3" stroke-linecap="round" />
            </g>
          </svg>
          <p class="login-scene-title">{{ $t('loginWorkspace') }}</p>
          <p class="login-scene-description">{{ $t('loginWorkspaceDescription') }}</p>
        </div>
      </div>

      <main ref="loginPanel" class="login-panel">
        <div class="login-content">
          <div class="login-brand">
            <img src="/mail.svg" alt="" class="login-mark" />
            <span>mail</span>
          </div>
          <div v-if="settingStore.settings.register === 0" class="login-mode" :class="{ 'is-register': show === 'register' }"
               role="group" :aria-label="$t('authMode')">
            <span class="login-mode-thumb" aria-hidden="true" />
            <button type="button" :aria-pressed="show === 'login'" @click="switchMode('login')">{{ $t('loginBtn') }}</button>
            <button type="button" :aria-pressed="show === 'register'" @click="switchMode('register')">{{ $t('regBtn') }}</button>
          </div>
          <div class="auth-stack" :class="'is-' + show">
          <header class="login-heading auth-pane auth-login" :class="{ 'is-active': show === 'login' }" :inert="show !== 'login'">
            <h1>{{ $t('loginHeading') }}</h1>
            <p>{{ $t('loginTitle') }}</p>
          </header>
          <header class="login-heading auth-pane auth-register" :class="{ 'is-active': show === 'register' }" :inert="show !== 'register'">
            <h1>{{ $t('regSwitch') }}</h1>
            <p>{{ $t('regTitle') }}</p>
          </header>
          </div>

          <div class="auth-stack auth-forms" :class="'is-' + show">
          <form class="login-form auth-pane auth-login" :class="{ 'is-active': show === 'login' }" :inert="show !== 'login'"
                :aria-hidden="show !== 'login'" @submit.prevent="submit">
            <EmailField
              id="login-email"
              v-model="form.email"
              v-model:suffix="suffix"
              :domains="domainList"
              :full-address="hideLoginDomain"
            />
            <div class="login-field">
              <div class="login-label-row">
                <label for="login-password">{{ $t('password') }}</label>
                <button type="button" class="login-forgot" @click="showForgot">{{ $t('forgotPassword') }}</button>
              </div>
              <el-input id="login-password" v-model="form.password" :placeholder="$t('password')" type="password" autocomplete="current-password" show-password />
            </div>
            <el-button class="login-submit" type="primary" native-type="submit" :loading="loginLoading">
              {{ $t('loginBtn') }}
            </el-button>
          </form>

          <form class="login-form auth-pane auth-register" :class="{ 'is-active': show === 'register' }" :inert="show !== 'register'"
                :aria-hidden="show !== 'register'" @submit.prevent="submitRegister">
            <EmailField
              id="register-email"
              v-model="registerForm.email"
              v-model:suffix="suffix"
              :domains="domainList"
              :full-address="hideLoginDomain"
            />
            <div class="login-field">
              <label for="register-password">{{ $t('password') }}</label>
              <el-input id="register-password" v-model="registerForm.password" :placeholder="$t('password')" type="password"
                        autocomplete="new-password" aria-describedby="register-password-note" show-password />
              <p id="register-password-note" class="login-field-note">{{ $t('authPasswordLength') }}</p>
            </div>
            <div class="login-field">
              <label for="register-confirm-password">{{ $t('confirmPwd') }}</label>
              <el-input id="register-confirm-password" v-model="registerForm.confirmPassword" :placeholder="$t('confirmPwd')" type="password" autocomplete="new-password" show-password />
            </div>
            <div v-if="settingStore.settings.regKey === 0 || settingStore.settings.regKey === 2" class="login-field">
              <label for="register-code">{{ $t(settingStore.settings.regKey === 0 ? 'regKey' : 'regKeyOptional') }}</label>
              <el-input id="register-code" v-model="registerForm.code" type="password" :placeholder="$t('regKey')" autocomplete="off" />
            </div>
            <div
              v-show="verifyShow"
              ref="turnstileContainer"
              :key="turnstileContainerKey"
              class="register-turnstile"
              :data-sitekey="settingStore.settings.siteKey"
              data-callback="onTurnstileSuccess"
              data-error-callback="onTurnstileError"
              data-after-interactive-callback="loadAfter"
              data-before-interactive-callback="loadBefore"
            >
              <span v-if="botJsError" class="login-verify-error">{{ $t('verifyModuleFailed', { action: $t('regBtn') }) }}</span>
            </div>
            <el-button class="login-submit" type="primary" native-type="submit" :loading="registerLoading">
              {{ $t('regBtn') }}
            </el-button>
          </form>
          </div>

          <div v-if="oauthProviders.length" class="login-oauth">
            <p class="login-oauth-label">{{ $t('loginAlternative') }}</p>
            <el-button v-for="provider in oauthProviders" :key="provider.key" class="login-oauth-button" @click="oauthLogin(provider.key)">
              <el-avatar v-if="provider.iconType === 'image'" :src="provider.icon" :size="18" />
              <Icon v-else :icon="provider.icon" width="18" height="18" />
              {{ provider.label }}
            </el-button>
          </div>

        </div>
      </main>
    </div>

    <el-dialog close-icon="MailCloseIcon" v-model="showBindForm" class="bind-dialog" :title="$t('loginBindHeading')">
      <form class="login-form" @submit.prevent="bind">
        <EmailField
          id="bind-email"
          v-model="bindForm.email"
          v-model:suffix="suffix"
          :domains="domainList"
          :full-address="hideLoginDomain"
        />
        <div v-if="settingStore.settings.regKey === 0 || settingStore.settings.regKey === 2" class="login-field">
          <label for="bind-code">{{ $t(settingStore.settings.regKey === 0 ? 'regKey' : 'regKeyOptional') }}</label>
          <el-input id="bind-code" v-model="bindForm.code" type="password" :placeholder="$t('regKey')" autocomplete="off" />
        </div>
        <el-button class="login-submit" type="primary" native-type="submit" :loading="bindLoading">
          {{ $t('loginBindHeading') }}
        </el-button>
      </form>
    </el-dialog>
  </div>
</template>

<script setup>
import router from "@/router";
import EmailField from './EmailField.vue';
import { ElMessageBox } from 'element-plus';
import {useRoute} from "vue-router";
import {computed, nextTick, reactive, ref} from "vue";
import {login} from "@/request/login.js";
import {register} from "@/request/login.js";
import {websiteConfig} from "@/request/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {oauthBindUser, oauthLinuxDoLogin, oauthGithubLogin, oauthGoogleLogin} from "@/request/ouath.js";
import {reloadTurnstileScript} from "@/utils/turnstile-script.js";

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const route = useRoute();
const loginLoading = ref(false)
const bindLoading = ref(false)
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login')
const loginPanel = ref(null)

function showForgot() {
  ElMessageBox.alert(t('forgotPasswordHint'), t('forgotPassword').replace(/[？?]$/, ''), {
    confirmButtonText: t('forgotPasswordOk'),
    customClass: 'mail-forgot-box',
    closeOnPressEscape: true,
    closeOnClickModal: true,
  }).catch(() => {})
}

function switchMode(mode) {
  show.value = mode
  loginPanel.value?.scrollTo({ top: 0 })
}

const oauthKeys = ['linuxdo', 'github', 'google']

const oauthProvider = computed(() => {
  const fromState = route.query.state
  if (oauthKeys.includes(fromState)) return fromState
  const fromStore = sessionStorage.getItem('oauthProvider')
  return oauthKeys.includes(fromStore) ? fromStore : null
})

const oauthProviders = computed(() => {
  const allProviders = [
    { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
    { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
    { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
  ]
  return allProviders.filter(p => settingStore.settings[p.key + 'Switch'] === 0)
})

const bindForm = reactive({
  email: '',
  oauthUserId: '',
  code: ''
})

const form = reactive({
  email: '',
  password: '',

});
const domainList = computed(() => settingStore.domainList)
const suffix = ref(domainList.value[0] ?? '')
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
})
const registerLoading = ref(false)
const verifyShow = ref(false)
let verifyToken = ''
let turnstileId = null
let botJsError = ref(false)
let verifyErrorCount = 0
let turnstileRecoveryAttempted = false
const turnstileContainer = ref(null)
const turnstileContainerKey = ref(0)

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
    if (show.value === 'login' || !turnstileContainer.value) return
    turnstileId = api.render(turnstileContainer.value)
  } catch (error) {
    botJsError.value = true
    console.warn('Turnstile recovery failed', error)
  } finally {
    turnstileRecoveryAttempted = false
  }
}

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.loadAfter = (e) => {
  console.log('loadAfter')
}

window.loadBefore = (e) => {
  console.log('loadBefore')
}

const loginOpacity = computed(() => {
  const opacity = settingStore.settings.loginOpacity
  return uiStore.dark ? `rgba(25, 25, 25, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
})

const hideLoginDomain = computed(() => settingStore.settings.loginDomain === 1)

const background = computed(() => {

  return settingStore.settings.background ? {
    'background-image': `url(${cvtR2Url(settingStore.settings.background)})`,
    'background-repeat': 'no-repeat',
    'background-size': 'cover',
    'background-position': 'center'
  } : ''
})

const getFullEmail = (email) => {
  const address = email.trim()
  return hideLoginDomain.value || address.includes('@') ? address : address + suffix.value
}

const getEmailName = (email) => {
  return email.split('@')[0]
}

function oauthLogin(provider) {
  const clientId = settingStore.settings[provider + 'ClientId']
  const redirectUri = encodeURIComponent(window.location.origin + '/login')
  sessionStorage.setItem('oauthProvider', provider)
  const authorizeUrls = {
    linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
    github: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${provider}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
  }
  window.location.href = authorizeUrls[provider]
}

const loginFns = {
  linuxdo: oauthLinuxDoLogin,
  github: oauthGithubLogin,
  google: oauthGoogleLogin,
}

oauthGetUser();

async function oauthGetUser() {

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code || !oauthProvider.value) return

  const provider = oauthProvider.value
  oauthLoading.value = true
  sessionStorage.removeItem('oauthProvider')
  window.history.replaceState({}, '', window.location.origin + window.location.pathname)

  loginFns[provider](code, window.location.origin + '/login').then(data => {

    bindForm.oauthUserId = data.userInfo.oauthUserId;

    if (!data.token) {
      showBindForm.value = true
      oauthLoading.value = false
      ElMessage({
        message: '请注册绑定一个邮箱',
        type: 'warning',
        duration: 4000,
        plain: true,
      })
      return;
    }

    saveToken(data.token);
  }).catch(() => {
    oauthLoading.value = false
  })
}

function bind() {

  if (bindLoading.value) return

  if (!bindForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }


  if (getEmailName(bindForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(bindForm.email);


  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!bindForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  const form = {email, oauthUserId: bindForm.oauthUserId, code: bindForm.code}

  bindLoading.value = true
  oauthBindUser(form).then(data => {
    saveToken(data.token)
  }).catch(() => {
    bindLoading.value = false
  })
}

const submit = () => {

  if (loginLoading.value) return

  if (!form.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(form.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  loginLoading.value = true
  login(email, form.password).then(async data => {
    await saveToken(data.token)
  }).finally(() => {
    loginLoading.value = false
  })
}

async function saveToken(token) {
  localStorage.setItem('token', token)
  refreshWebsiteConfig()
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  const routers = permsToRouter(user.permKeys);
  routers.forEach(routerData => {
    router.addRoute('layout', routerData);
  });
  await router.replace({name: 'layout'})
  uiStore.showNotice()
  oauthLoading.value = false;
  bindLoading.value = false;
}

function refreshWebsiteConfig() {
  websiteConfig().then(setting => {
    settingStore.settings = setting
    settingStore.domainList = setting.domainList
    if (!suffix.value && setting.domainList.length > 0) {
      suffix.value = setting.domainList[0]
    }
  }).catch(e => {
    console.error(e)
  })
}


function submitRegister() {

  if (registerLoading.value) return

  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (getEmailName(registerForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const email = getFullEmail(registerForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {

    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!registerForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (turnstileRecoveryAttempted) return
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.register-turnstile')
          } catch (e) {
            botJsError.value = true
            console.log('人机验证js加载失败')
            recoverTurnstile()
          }
        } else {
          window.turnstile.reset('.register-turnstile')
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

  registerLoading.value = true

  const form = {
    email,
    password: registerForm.password,
    token: verifyToken,
    code: registerForm.code
  }

  register(form).then(({regVerifyOpen}) => {
    show.value = 'login'
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    registerForm.code = ''
    registerLoading.value = false
    verifyToken = ''
    settingStore.settings.regVerifyOpen = regVerifyOpen
    verifyShow.value = false
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    })
  }).catch(res => {

    registerLoading.value = false

    if (res.code === 400) {
      verifyToken = ''
      settingStore.settings.regVerifyOpen = true
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.register-turnstile')
        })
      }
      verifyShow.value = true

    }
  });
}

</script>

<style scoped>
#login-box {
  --login-stage: var(--mac-app);
  --login-surface: var(--mac-surface);
  --login-field: var(--mac-surface);
  --login-line: var(--mac-line);
  --login-ink: var(--mac-text);
  --login-muted: var(--mac-text-2);
  --login-focus: var(--mac-focus);
  --login-action: var(--mac-accent);
  --login-action-hover: var(--mac-accent-hover);
  --login-action-ink: var(--mac-accent-text);
  --el-color-primary: var(--login-action);
  --el-input-focus-border-color: var(--login-focus);
  --login-edge: clamp(16px, min(4vw, 4vh), 48px);
  --login-control-height: 36px;
  color-scheme: light;

  position: relative;
  display: grid;
  place-items: center;
  padding: var(--login-edge);
  min-height: 100dvh;
  background: var(--mac-wallpaper);
  color: var(--login-ink);
}

#login-box.is-dark {
  color-scheme: dark;
}

.login-background {
  position: absolute;
  inset: 0;
}

.login-shell {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  width: min(100%, 980px);
  height: max(560px, min(620px, calc(100dvh - 2 * var(--login-edge))));
  overflow: hidden;
  border-radius: 22px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-edge), var(--mac-shadow-window);
  animation: mac-sheet-in var(--mac-dur-4) var(--mac-spring) both;
}

.has-custom-background .login-shell {
  width: min(100%, 470px);
  grid-template-columns: minmax(0, 1fr);
  background: transparent;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-block-end: 16px;
  font-size: 22px;
  font-weight: 730;
  letter-spacing: -.045em;
}

.login-mark {
  width: 34px;
  height: 34px;
  flex: none;
}

.login-scene {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 38px clamp(24px, 4vw, 44px);
  background: transparent;
}

.login-scene-inner {
  width: min(100%, 488px);
  text-align: center;
}

.login-illustration {
  display: block;
  width: 100%;
  margin-block-end: 15px;
}

.login-scene-title {
  font-size: clamp(23px, 2.4vw, 34px);
  font-weight: 730;
  line-height: 1.2;
  letter-spacing: -.035em;
}

.login-scene-description {
  margin-block-start: 13px;
  color: var(--login-muted);
  font-size: 15px;
  line-height: 1.65;
}

.login-panel {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: safe center;
  min-width: 0;
  min-height: 0;
  padding: clamp(22px, 3vw, 30px) clamp(24px, 4vw, 52px);
  overflow-y: auto;
  scrollbar-width: none;
  border-inline-start: .5px solid rgb(0 0 0 / 8%);
  background: var(--glass-bg-strong);
}

.has-custom-background .login-panel {
  border-inline-start: 0;
  background: v-bind(loginOpacity);
  backdrop-filter: blur(10px);
}

.login-content {
  width: min(100%, 390px);
  min-width: 0;
}

/* 分段控件：滑块像开关一样以弹簧滑到另一侧 */
.login-mode {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-block-end: 20px;
  padding: 3px;
  border-radius: 10px;
  background: rgb(0 0 0 / 6%);
}
#login-box.is-dark .login-mode { background: rgb(255 255 255 / 8%); }

.login-mode-thumb {
  position: absolute;
  inset-block: 3px;
  inset-inline-start: 3px;
  width: calc(50% - 3px);
  border-radius: 8px;
  background: var(--login-surface);
  box-shadow: 0 0 0 .5px rgb(0 0 0 / 8%), 0 2px 6px rgb(0 0 0 / 12%);
  transition: transform var(--mac-dur-3) var(--mac-spring);
}
#login-box.is-dark .login-mode-thumb { background: #3A3A3C; }
.login-mode.is-register .login-mode-thumb { transform: translateX(100%); }

.login-mode button {
  position: relative;
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  color: var(--login-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: color var(--mac-dur-2) ease;
}

.login-mode button:hover { color: var(--login-ink); }

.login-mode button[aria-pressed="true"] {
  color: var(--login-ink);
  font-weight: 600;
}

/* 登录与注册叠放在同一格：外框与位置不变，内容交叉淡入并带方向位移 */
.auth-stack {
  display: grid;
}
/* 旧内容 100ms 内淡出，新内容延后 90ms 以弹簧滑入，两者几乎不重叠 */
.auth-stack > .auth-pane {
  grid-area: 1 / 1;
  min-width: 0;
  transition: opacity 260ms var(--mac-ease) 90ms, transform var(--mac-dur-4) var(--mac-spring) 90ms, visibility 0s linear 0s;
}
.auth-stack > .auth-pane:not(.is-active) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 100ms ease, transform 200ms var(--mac-ease), visibility 0s linear 200ms;
}
.auth-stack > .auth-login:not(.is-active) { transform: translateX(-24px); }
.auth-stack > .auth-register:not(.is-active) { transform: translateX(24px); }
.auth-forms { align-items: start; }

.login-heading {
  margin-block-end: 18px;
}

.login-heading h1 {
  font-size: clamp(26px, 2.6vw, 32px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.02em;
}

.login-heading p {
  margin-block-start: 7px;
  color: var(--login-muted);
  line-height: 1.65;
}

.login-form, .login-oauth {
  display: grid;
  gap: 10px;
}

.login-field-note {
  color: var(--login-muted);
  font-size: 12px;
}

.login-form :deep(.login-field) {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.login-form :deep(label) {
  color: var(--login-ink);
  font-size: 13px;
  font-weight: 620;
}

.login-form :deep(.el-input) {
  --el-input-height: var(--login-control-height);
  --el-input-bg-color: var(--login-field);
  --el-input-border-color: var(--login-line);
  --el-input-hover-border-color: var(--login-focus);
  --el-input-border-radius: 8px;
  min-width: 0;
}

.login-form :deep(.el-input__wrapper) {
  min-width: 0;
  padding-inline: 12px;
}

.login-form :deep(.el-input__inner:-webkit-autofill) {
  -webkit-box-shadow: 0 0 0 100px var(--login-field) inset;
  -webkit-text-fill-color: var(--login-ink);
  caret-color: var(--login-ink);
  border-radius: 4px;
}

.login-form :deep(.el-input__inner:autofill) {
  box-shadow: 0 0 0 100px var(--login-field) inset;
  caret-color: var(--login-ink);
}

/* 域名后缀按字符长度分配宽度，最多占 60%，前缀拿剩下的；整组仍是一个输入框 */
.login-form :deep(.el-input-group__append) {
  flex: 0 0 auto;
  width: var(--domain-width, auto);
  max-width: 60%;
  padding: 0;
  border-radius: 0 var(--r-control) var(--r-control) 0;
}
.login-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.login-forgot {
  padding: 2px 6px;
  margin-inline-end: -6px;
  border-radius: var(--r-small);
  color: var(--login-muted);
  cursor: pointer;
  font-size: 12px;
  transition: background-color var(--mac-dur-1) ease, color var(--mac-dur-1) ease;
}
.login-forgot:hover { background: var(--mac-hover); color: var(--login-ink); }
.login-forgot:focus-visible { outline: none; box-shadow: var(--mac-focus-ring); }

.login-form :deep(.login-domain-text) {
  display: block;
  overflow: hidden;
  padding-inline: 11px;
  color: var(--login-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-form :deep(.login-domain-select) {
  width: 100%;
  max-width: 100%;
  margin: 0;
}

.login-form :deep(.login-domain-select .el-select__wrapper) {
  min-height: var(--login-control-height);
  padding-inline: 10px;
  border-radius: 0 var(--r-control) var(--r-control) 0;
  background: transparent;
  box-shadow: none;
  font-size: 13px;
}

.login-form :deep(.login-domain-select .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--login-focus) inset;
}

.login-submit.el-button {
  --el-button-bg-color: var(--login-action);
  --el-button-border-color: var(--login-action);
  --el-button-text-color: var(--login-action-ink);
  --el-button-hover-bg-color: var(--login-action-hover);
  --el-button-hover-border-color: var(--login-action-hover);
  --el-button-hover-text-color: var(--login-action-ink);
  --el-button-active-bg-color: var(--login-action);
  --el-button-active-border-color: var(--login-action);
  --el-button-active-text-color: var(--login-action-ink);
  width: 100%;
  height: var(--login-control-height);
  margin-block-start: 2px;
  border-radius: 8px;
  font-weight: 650;
}

.login-oauth {
  gap: 8px;
  margin-block-start: 22px;
  padding-block-start: 18px;
  border-block-start: 1px solid var(--login-line);
}

.login-oauth-label {
  color: var(--login-muted);
  text-align: center;
  font-size: 12px;
}

.login-oauth-button.el-button {
  --el-button-border-color: var(--login-line);
  --el-button-hover-border-color: var(--login-focus);
  --el-button-hover-bg-color: var(--login-field);
  --el-button-hover-text-color: var(--login-ink);
  width: 100%;
  height: 40px;
  margin-inline-start: 0;
  border-radius: 8px;
}

.login-oauth-button :deep(> span) {
  gap: 8px;
}

.login-mode button:focus-visible, .login-submit:focus-visible {
  outline: 2px solid var(--login-focus);
  outline-offset: 3px;
}

.register-turnstile {
  max-width: 100%;
  overflow-x: auto;
}

.login-verify-error {
  color: var(--el-color-danger);
  font-size: 12px;
}

:deep(.bind-dialog) {
  width: min(440px, calc(100% - 36px));
  border-radius: 12px;
}

@media (max-width: 820px) {
  .login-shell {
    width: min(100%, 470px);
    grid-template-columns: minmax(0, 1fr);
  }

  .login-scene { display: none; }

  .login-panel {
    padding: clamp(20px, 5vw, 36px);
    border-inline-start: 0;
  }
}

@media (max-height: 680px) {
  #login-box { --login-control-height: 38px; }
  .login-panel { padding-block: 18px; }
  .login-brand, .login-mode, .login-heading { margin-block-end: 12px; }
  .login-form { gap: 8px; }
}

</style>

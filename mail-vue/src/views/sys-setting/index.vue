<template>
  <div class="settings-container">
    <el-skeleton v-if="firstLoading" class="page-skeleton" :rows="6" animated />
    <SettingsWorkspace v-else :sections="systemSections" v-slot="{ section }">
      <!-- Basic Settings Card -->
      <section v-show="section === 'general'" class="settings-card">
        <h3 class="card-title">{{ $t('websiteSetting') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('websiteReg') }}</span></div>
            <div>
              <el-switch @change="changeField('register', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.register"/>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('loginDomain') }}</span></div>
            <div>
              <el-switch @change="changeField('loginDomain', $event)" :before-change="beforeChange" :active-value="1" :inactive-value="0"
                         :model-value="setting.loginDomain"/>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('regKey') }}</span></div>
            <div>
              <el-select suffix-icon="MailChevronDown"
                  @change="changeField('regKey', $event)"
                  :style="`width: ${ locale === 'en' ?  100 : 80 }px;`"
                  :model-value="setting.regKey"
                  placeholder="Select"
              >
                <el-option
                    v-for="item in regKeyOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
              </el-select>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('addAccount') }}</span></div>
            <div>
              <el-switch @change="changeField('addEmail', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.addEmail"/>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('multipleEmail') }}</span>
              <el-tooltip effect="dark" :content="$t('multipleEmailDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <div>
              <el-switch @change="changeField('manyEmail', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.manyEmail"/>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('syncDelete') }}</span>
              <el-tooltip effect="dark" :content="$t('syncDeleteDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <div>
              <el-switch @change="changeField('syncDelete', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.syncDelete"/>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('emailPrefix') }}</span>
            </div>
            <div class="forward">
              <el-button class="opt-button" size="small" @click="openEmailPrefix">{{ $t('configure') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Personalization Settings Card -->
      <section v-show="section === 'general'" class="settings-card">
        <h3 class="card-title">{{ $t('customization') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('appName') }}</span></div>
            <div>mail</div>
          </div>
          <div class="setting-item">
            <div class="title-item"><span>{{ $t('loginBoxOpacity') }}</span></div>
            <div>
              <el-input-number size="small" v-model="loginOpacity" @change="opacityChange" :precision="2"
                               :step="0.01" :max="1" :min="0"/>
            </div>
          </div>
          <div class="setting-item personalized">
            <div><span>{{ $t('loginBackground') }}</span></div>
            <div>
              <el-image
                  class="background"
                  :src="cvtR2Url(setting.background)"
                  :preview-src-list="[cvtR2Url(setting.background)]"
                  show-progress
                  fit="cover"
              >
                <template #error>
                  <div class="error-image">
                    <NavigationIcon name="image" :size="24" />
                  </div>
                </template>
              </el-image>
              <div class="background-btn">
                <el-button class="opt-button" size="small" @click="openSetBackground">{{ $t('change') }}</el-button>
                <el-button class="opt-button" size="small" @click="delBackground">{{ $t('delete') }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Email Sending Settings Card -->
      <section v-show="section === 'mail'" class="settings-card">
        <h3 class="card-title">{{ $t('emailSetting') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('receiveEmail') }}</span></div>
            <div>
              <el-switch @change="changeField('receive', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.receive"/>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('autoRefresh') }}</span>
              <el-tooltip effect="dark" :content="$t('autoRefreshDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <div>
              <el-select suffix-icon="MailChevronDown"
                  @change="changeField('autoRefresh', $event)"
                  :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                  :model-value="setting.autoRefresh"
                  placeholder="Select"
              >
                <el-option
                    v-for="item in authRefreshOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
              </el-select>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('sendEmail') }}</span></div>
            <div>
              <el-switch @change="changeField('send', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.send"/>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('noRecipientTitle') }}</span>
              <el-tooltip effect="dark" :content="$t('noRecipientDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <div>
              <el-switch @change="changeField('noRecipient', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.noRecipient"/>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ setting.hasCfEmail ? $t('cloudflareEmailSending') : $t('resendToken') }}</span></div>
            <div v-if="setting.hasCfEmail">
              <span>{{ $t('enabled') }}</span>
            </div>
            <div v-else>
              <ConfigStatus :configured="resendList.length > 0" />
              <el-button class="opt-button" @click="openResendList" size="small">{{ $t('manage') }}</el-button>
              <el-button class="opt-button" @click="openResendForm" size="small">{{ $t('add') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('blackList') }}</span></div>
            <div>
              <el-button class="opt-button" @click="openBlackListForm" size="small">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('autoClean') }}</span>
              <el-tooltip effect="dark" :content="$t('autoCleanDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <div class="forward">
              <span>{{ setting.autoCleanDays > 0 ? $t('autoCleanRetain', { days: setting.autoCleanDays }) : $t('disabled') }}</span>
              <el-button class="opt-button" @click="openAutoClean" size="small">{{ $t('configure') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <section v-show="section === 'integrations'" class="settings-card">
        <h3 class="card-title">{{ $t('emailPush') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('tgBot') }}</span></div>
            <div class="forward">
              <ConfigStatus :configured="Boolean(setting.tgBotToken && setting.tgChatId)" />
              <el-button class="opt-button" size="small" @click="openTgSetting">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('otherEmail') }}</span></div>
            <div class="forward">
              <ConfigStatus :configured="Boolean(setting.forwardEmail)" />
              <el-button class="opt-button" size="small" @click="openThirdEmailSetting">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('webhook') }}</span></div>
            <div class="forward">
              <ConfigStatus :configured="Boolean(setting.webhookUrl)" />
              <el-button class="opt-button" size="small" @click="openWebhookSetting">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <ChatBotSettings v-if="section === 'integrations'" />
          <div class="setting-item">
            <div><span>{{ $t('forwardingRules') }}</span></div>
            <div class="forward">
              <span>{{ setting.ruleType === 0 ? $t('forwardAll') : $t('rules') }}</span>
              <el-button class="opt-button" size="small" @click="openForwardRules">{{ $t('configure') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Object Storage Card -->
      <section v-show="section === 'integrations'" class="settings-card">
        <h3 class="card-title">{{ $t('oss') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div>
              <span>{{ $t('s3Configuration') }}</span>
            </div>
            <div class="r2domain">
              <ConfigStatus :configured="Boolean(setting.endpoint && setting.bucket && setting.s3AccessKey && setting.s3SecretKey)" />
              <el-button class="opt-button" size="small" @click="addS3Show = true">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div>
              <span>{{ $t('storageType') }}</span>
            </div>
            <div class="r2domain">
              <div class="storage-type">
                <el-tag>{{ setting.storageType }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Turnstile Verification Card -->
      <section v-show="section === 'security'" class="settings-card">
        <h3 class="card-title">{{ $t('turnstileSetting') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('signUpVerification') }}</span></div>
            <div>
              <el-button class="opt-button" size="small" @click="openRegVerifyCount">{{ $t('configure') }}</el-button>
              <el-select suffix-icon="MailChevronDown"
                  @change="changeField('registerVerify', $event)"
                  :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                  :model-value="setting.registerVerify"
                  placeholder="Select"
                  class="bot-verify-select"
              >
                <el-option :value="0" :label="$t('enable')"/>
                <el-option :value="1" :label="$t('disable')"/>
                <el-option :value="2" :label="$t('rulesVerify')"/>
              </el-select>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('addEmailVerification') }}</span></div>
            <div>
              <el-button class="opt-button" size="small" @click="openAddVerifyCount">{{ $t('configure') }}</el-button>
              <el-select suffix-icon="MailChevronDown"
                  @change="changeField('addEmailVerify', $event)"
                  :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                  :model-value="setting.addEmailVerify"
                  placeholder="Select"
                  class="bot-verify-select"
              >
                <el-option :value="0" :label="$t('enable')"/>
                <el-option :value="1" :label="$t('disable')"/>
                <el-option :value="2" :label="$t('rulesVerify')"/>
              </el-select>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('siteKeyLabel') }}</span></div>
            <div class="bot-verify">
              <span v-if="setting.siteKey" class="credential-mask" aria-hidden="true">********</span>
              <ConfigStatus :configured="Boolean(setting.siteKey)" />
              <el-button class="opt-button" size="small" @click="turnstileShow = true">{{ $t('change') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('secretKeyLabel') }}</span></div>
            <div class="bot-verify">
              <span v-if="setting.secretKey" class="credential-mask" aria-hidden="true">********</span>
              <ConfigStatus :configured="Boolean(setting.secretKey)" />
              <el-button class="opt-button" size="small" @click="turnstileShow = true">{{ $t('change') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <section v-show="section === 'notice'" class="settings-card">
        <h3 class="card-title">{{ $t('noticeInfo') }}</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('noticePopup') }}</span></div>
            <div class="forward">
              <span>{{ setting.notice === 0 ? $t('enabled') : $t('disabled') }}</span>
              <el-button class="opt-button" size="small" @click="openNoticePopupSetting">{{ $t('configure') }}</el-button>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('popUp') }}</span></div>
            <div class="forward">
              <el-button class="opt-button" size="small" @click="openNoticePopup">{{ $t('viewNotice') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <section v-show="section === 'integrations'" class="settings-card">
        <h3 class="card-title">Workers AI</h3>
        <div class="card-content">
          <div class="setting-item">
            <div><span>{{ $t('codeRecognition') }}</span></div>
            <div>
              <el-switch @change="changeField('aiCode', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                         :model-value="setting.aiCode"/>
            </div>
          </div>
          <div class="setting-item">
            <div><span>{{ $t('codeRecognitionRules') }}</span></div>
            <div class="forward">
              <el-button class="opt-button" size="small" @click="openAiCodeFilter">{{ $t('configure') }}</el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- OAuth Login Card -->
      <section v-show="section === 'security'" class="settings-card">
        <h3 class="card-title">{{ $t('oauthLogin') }}</h3>
        <div class="card-content">
          <div class="setting-item" v-for="p in oauthPlatforms" :key="p.key">
            <div>
              <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="22" class="oauth-icon"/>
              <Icon v-else :icon="p.icon" width="22" height="22" class="oauth-icon"/>
              <span>{{ p.label }}</span>
            </div>
            <div class="forward">
              <ConfigStatus :configured="Boolean(setting[p.key + 'ClientId'] && setting[p.key + 'ClientSecret'])" />
              <el-button class="opt-button" size="small" @click="openOauthSetting(p)">{{ $t('configure') }}</el-button>
            </div>
          </div>
        </div>
      </section>

    </SettingsWorkspace>

    <template v-if="!firstLoading">
      <el-dialog close-icon="MailCloseIcon" v-model="resendTokenFormShow" :title="$t('resendToken')" width="340" @closed="cleanResendTokenForm">
        <form @submit.prevent>
          <el-select suffix-icon="MailChevronDown" style="margin-bottom: 15px" v-model="resendTokenForm.domain" placeholder="Select"
                     @change="cleanResendTokenForm">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <CredentialField v-model="resendTokenForm.token" :label="$t('addResendTokenDesc')"
                           :configured="Boolean(setting.resendTokens?.[resendTokenForm.domain?.slice(1)])"
                           clearable @submit="saveResendToken" />
          <el-button type="primary" :loading="settingLoading" :disabled="resendTokenForm.token === undefined"
                     @click="saveResendToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="turnstileShow" :title="$t('addTurnstileSecret')" width="340"
                 @closed="turnstileForm.secretKey = undefined; turnstileForm.siteKey = undefined">
        <form class="credential-form" @submit.prevent>
          <CredentialField v-model="turnstileForm.siteKey" :label="$t('siteKeyLabel')"
                           :configured="Boolean(setting.siteKey)" clearable @submit="saveTurnstileKey" />
          <CredentialField v-model="turnstileForm.secretKey" :label="$t('secretKeyLabel')"
                           :configured="Boolean(setting.secretKey)" clearable @submit="saveTurnstileKey" />
          <el-button type="primary" :loading="settingLoading" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="oauthSettingShow" :title="$t('oauthSetting') + ' - ' + oauthForm.label" width="340"
                 @closed="oauthForm.clientId = undefined; oauthForm.clientSecret = undefined; oauthForm.switch = 1">
        <div class="credential-form">
          <CredentialField v-model="oauthForm.clientId" :label="$t('clientId')"
                           :configured="Boolean(setting[oauthForm.key + 'ClientId'])" clearable />
          <CredentialField v-model="oauthForm.clientSecret" :label="$t('clientSecret')"
                           :configured="Boolean(setting[oauthForm.key + 'ClientSecret'])" clearable />
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="oauthForm.switch" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button type="primary" :loading="settingLoading" @click="saveOauth">{{ $t('save') }}</el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon"
          v-model="showSetBackground"
          class="cut-dialog"
          @closed="closedSetBackground"
      >
        <template #header>
          <span style="font-size: 18px">
            {{ $t('backgroundTitle') }}
            <el-tooltip>
              <template #content>
                <span>{{ $t('backgroundWarning') }}</span>
              </template>
              <NavigationIcon name="info" class="title-icon  warning" />
            </el-tooltip>
          </span>
        </template>
        <el-input :placeholder="$t('backgroundUrlDesc')" v-model="backgroundUrl" v-if="!localUpShow"
                  class="background-url" @keyup.enter="saveBackground"/>
        <el-image
            v-if="localUpShow"
            :preview-src-list="[backgroundImage]"
            show-progress
            class="cropper"
            fit="cover"
            :src="backgroundImage"
        ></el-image>
        <div class="cut-button">
          <el-button type="primary" link @click="openCut" v-if="!localUpShow">
            {{ $t('localUpload') }}
          </el-button>
          <el-button type="primary" link @click="localUpShow = false" v-if="localUpShow">
            {{ $t('imageLink') }}
          </el-button>
          <el-button type="primary" :loading="settingLoading" @click="saveBackground">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon"
          v-model="tgSettingShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('tgBot') }}</span>
            <el-tooltip effect="dark" :content="$t('tgBotDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <CredentialField v-model="tgBotToken" :label="$t('tgBotToken')"
                           :configured="Boolean(setting.tgBotToken)" @submit="tgBotSave" />
          <el-input-tag tag-type="warning" :placeholder="$t('toBotTokenDesc')" v-model="tgChatId"
                        @add-tag="addChatTag"></el-input-tag>
          <el-input tag-type="warning" :placeholder="$t('customDomainDesc')" v-model="customDomain" @keyup.enter="tgBotSave"></el-input>
          <div class="tg-msg-label">
            <span>{{t('from')}}</span>
            <el-select suffix-icon="MailChevronDown"  v-model="tgMsgFrom" >
              <el-option
                  v-for="item in tgMsgFromOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('recipient')}}</span>
            <el-select suffix-icon="MailChevronDown"  v-model="tgMsgTo" >
              <el-option
                  v-for="item in tgMsgToOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('emailText')}}</span>
            <el-select suffix-icon="MailChevronDown"  v-model="tgMsgText" >
              <el-option
                  v-for="item in tgMsgTextOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="tgBotStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="tgBotSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon"
          v-model="thirdEmailShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('otherEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('otherEmailDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag tag-type="warning" :placeholder="$t('otherEmailInputDesc')" v-model="forwardEmail"
                        @add-tag="emailAddTag"></el-input-tag>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="forwardStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="forwardEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon"
          v-model="webhookShow"
          class="forward-dialog"
          @closed="webhookFormatShow = false"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('webhook') }}</span>
            <el-tooltip effect="dark" :content="$t('webhookDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('webhookUrl')" v-model="webhookUrl" @keyup.enter="webhookSave"></el-input>
          <CredentialField v-model="webhookSecret" :label="$t('webhookSecret')"
                           :configured="Boolean(setting.webhookSecret)" clearable @submit="webhookSave" />
          <div class="tg-msg-label">
            <span>{{ t('webhookRetry') }}</span>
            <el-input-number v-model="webhookRetry" :min="0" :max="5" controls-position="right"/>
          </div>
          <div v-show="webhookFormatShow" class="webhook-format">
            <pre>Content-Type: application/json
Authorization: &lt;secret&gt;</pre>
            <pre>{{ webhookPayloadExample }}</pre>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="webhookStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div class="webhook-footer-right">
              <button type="button" class="webhook-format-title" :aria-expanded="webhookFormatShow"
                      @click="webhookFormatShow = !webhookFormatShow">
                <span>{{ $t('webhookFormat') }}</span>
                <NavigationIcon class="disclosure-chevron" name="chevron" :size="15" />
              </button>
              <el-button :loading="settingLoading" type="primary" @click="webhookSave">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon"
          v-model="forwardRulesShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('forwardingRules') }}</span>
            <el-tooltip effect="dark" :content="$t('forwardingRulesDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag :placeholder="$t('ruleEmailsInputDesc')" tag-type="success" v-model="ruleEmail"
                        @add-tag="ruleEmailAddTag"/>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-radio-group v-model="ruleType">
              <el-radio :value="0">{{ $t('forwardAll') }}</el-radio>
              <el-radio :value="1">{{ $t('rules') }}</el-radio>
            </el-radio-group>
            <el-button :loading="settingLoading" type="primary" @click="ruleEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" class="resend-table" v-model="showResendList" :title="$t('resendTokenList')">
        <el-table class="mail-inset-table" :data="resendList" max-height="min(360px, calc(100dvh - 120px))">
          <el-table-column min-width="150" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column min-width="170" label="Token">
            <template #default="{ row }">
              <div class="token-status">
                <span class="credential-mask" aria-hidden="true">********</span>
                <ConfigStatus :configured="row.configured" />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="regVerifyCountShow" :title="$t('rulesVerifyTitle',{count: regVerifyCount})"
                 @closed="regVerifyCount = setting.regVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="regVerifyCount" :min="1" @keyup.enter="saveRegVerifyCount">
          </el-input-number>
          <el-button type="primary" :loading="settingLoading" @click="saveRegVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="addVerifyCountShow" :title="$t('rulesVerifyTitle',{count: addVerifyCount})"
                 @closed="addVerifyCount = setting.addVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="addVerifyCount" :min="1" @keyup.enter="saveAddVerifyCount"/>
          <el-button type="primary" :loading="settingLoading" @click="saveAddVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="noticePopupShow" :title="$t('noticePopup')" class="notice-popup"
                 @closed="resetNoticeForm">
        <form @submit.prevent>
          <el-input v-model="noticeForm.noticeTitle" :placeholder="t('titleDesc')" @keyup.enter="saveNoticePopup"/>
          <div class="notice-line-item">
            <el-select suffix-icon="MailChevronDown" v-model="noticeForm.noticeType">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('icon') }}</span>
              </template>
              <el-option key="none" label="None" value="none"/>
              <el-option key="primary" label="Primary" value="primary"/>
              <el-option key="success" label="Success" value="success"/>
              <el-option key="warning" label="Warning" value="warning"/>
              <el-option key="info" label="Info" value="info"/>
            </el-select>
            <el-select suffix-icon="MailChevronDown" v-model="noticeForm.noticePosition">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('position') }}</span>
              </template>
              <el-option key="top-left" :label="t('topLeft')" value="top-left"/>
              <el-option key="top-right" :label="t('topRight')" value="top-right"/>
              <el-option key="bottom-left" :label="t('bottomLeft')" value="bottom-left"/>
              <el-option key="bottom-right" :label="t('bottomRight')" value="bottom-right"/>
            </el-select>
            <el-input-number v-model="noticeForm.noticeWidth">
              <template #prefix>
                {{ $t('width') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeOffset">
              <template #prefix>
                {{ $t('offset') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeDuration">
              <template #prefix>
                {{ $t('duration') }}
              </template>
              <template #suffix>
                ms
              </template>
            </el-input-number>
          </div>
          <div class="notice-popup-item">
            <el-input
                v-model="noticeForm.noticeContent"
                :autosize="{ minRows: 15, maxRows: 25 }"
                type="textarea"
                :placeholder="t('noticeContentDesc')"
            />
          </div>
        </form>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="noticeForm.notice" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div>
              <el-button @click="previewNoticePopup">
                {{ $t('preview') }}
              </el-button>
              <el-button :loading="settingLoading" type="primary" @click="saveNoticePopup">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="addS3Show" :title="t('s3Configuration')" width="340" @closed="resetAddS3Form">
        <form @submit.prevent>
          <el-input class="dialog-input" type="text" placeholder="Bucket" v-model="s3.bucket" @keyup.enter="saveS3"/>
          <el-input class="dialog-input" type="text" placeholder="Endpoint" v-model="s3.endpoint" @keyup.enter="saveS3"/>
          <el-input class="dialog-input" type="text" placeholder="Region" v-model="s3.region" @keyup.enter="saveS3"/>
          <CredentialField class="dialog-input" v-model="s3.s3AccessKey" label="Access key"
                           :configured="Boolean(setting.s3AccessKey)" @submit="saveS3" />
          <CredentialField class="dialog-input" v-model="s3.s3SecretKey" :label="$t('secretKeyLabel')"
                           :configured="Boolean(setting.s3SecretKey)" @submit="saveS3" />
          <div class="force-path-style">
            <div class="force-path-style-left">
              <span>ForcePathStyle</span>
              <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
                <NavigationIcon name="info" class="warning" />
              </el-tooltip>
            </div>
            <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="s3.forcePathStyle"/>
          </div>
          <div class="s3-button">
            <el-button :loading="clearS3Loading" @click="clearS3">{{ t('clear') }}</el-button>
            <el-button type="primary" :loading="settingLoading && !clearS3Loading" @click="saveS3">{{ t('save') }}</el-button>
          </div>
        </form>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="emailPrefixShow" :title="t('emailPrefix')"  @closed="resetEmailPrefix"  >
        <div class="email-prefix">
          <div>{{ t('atLeast') }}</div>
          <el-input-number v-model="minEmailPrefix" :min="1" :max="20" style="width: 150px" @keyup.enter="saveEmailPrefix" >
            <template #suffix>
              <span>{{ t('character') }}</span>
            </template>
          </el-input-number>
        </div>
        <div class="prefix-filter">
          <div style="margin-bottom: 10px;">{{ t('mustNotContain') }}</div>
          <el-input-tag style="margin-bottom: 10px;" v-model="emailPrefixFilter"  />
        </div>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveEmailPrefix">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="blackFormShow" class="forward-dialog" @closed="resetBlackList">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('blackList') }}</span>
            <el-tooltip effect="dark" :content="$t('blackListDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('blackFromDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackFrom" @add-tag="banEmailAddTag"  />
          </el-form-item>
          <el-form-item :label="t('blackSubjectDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackSubject"/>
          </el-form-item>
          <el-form-item :label="t('blackContentDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackContent"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveBlackList">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="autoCleanShow" :title="t('autoClean')" class="forward-dialog" @closed="resetAutoClean">
        <el-form>
          <el-form-item :label="t('autoCleanDays')" label-position="top">
            <el-input-number v-model="autoCleanDays" :min="0" :max="3650" style="width: 100%"/>
          </el-form-item>
          <el-form-item :label="t('autoCleanExclude')" label-position="top">
            <el-input-tag
                tag-type="warning"
                :placeholder="$t('autoCleanExcludeDesc')"
                v-model="autoCleanExclude"
                @add-tag="autoCleanExcludeAddTag"
            />
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAutoClean">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog close-icon="MailCloseIcon" v-model="aiCodeFilterShow" class="forward-dialog" @closed="resetAiCodeFilter">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('codeRecognitionRules') }}</span>
            <el-tooltip effect="dark" :content="$t('codeRecognitionRulesDesc')">
              <NavigationIcon name="info" class="warning" />
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('senderRules')" label-position="top">
            <el-input-tag v-model="aiCodeFilter" @add-tag="aiCodeFilterAddTag"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAiCodeFilter">{{ $t('save') }}</el-button>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import {computed, defineOptions, nextTick, reactive, ref} from "vue";
import {deleteBackground, setBackground, setBlackList, settingQuery, settingSet} from "@/request/setting.js";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useAccountStore} from "@/store/account.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url, toOssDomain} from "@/utils/convert.js";
import {storeToRefs} from "pinia";
import {debounce} from 'lodash-es'
import {isDomain, isEmail, isIpUrl} from "@/utils/verify-utils.js";
import {fileToBase64} from "@/utils/file-utils.js"
import {useI18n} from 'vue-i18n';
import SettingsWorkspace from "@/components/settings-workspace/index.vue";
import ConfigStatus from '@/components/config-status/index.vue'
import CredentialField from '@/components/credential-field/index.vue'
import ChatBotSettings from './ChatBotSettings.vue'

const systemSections = [
  { key: 'general', label: 'settingsGeneral', icon: 'settings', description: 'settingsGeneralDesc' },
  { key: 'mail', label: 'settingsMail', icon: 'mail', description: 'settingsMailDesc' },
  { key: 'integrations', label: 'settingsIntegrations', icon: 'link', description: 'settingsIntegrationsDesc' },
  { key: 'security', label: 'settingsSecurity', icon: 'shield', description: 'settingsSecurityDesc' },
  { key: 'notice', label: 'noticeTitle', icon: 'bell', description: 'settingsNoticeDesc' },
]

defineOptions({
  name: 'sys-setting'
})

const {t, locale} = useI18n();
const firstLoading = ref(true)
const settingReady = ref(false)
const backgroundImage = ref('')
const localUpShow = ref(false)
const accountStore = useAccountStore();
const userStore = useUserStore();
const resendTokenFormShow = ref(false)
const blackFormShow = ref(false)
const autoCleanShow = ref(false)
const aiCodeFilterShow = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const noticePopupShow = ref(false)
const thirdEmailShow = ref(false)
const webhookShow = ref(false)
const forwardRulesShow = ref(false)
const emailPrefixShow = ref(false)
const showResendList = ref(false)
const settingStore = useSettingStore();
const uiStore = useUiStore();
const {settings: setting} = storeToRefs(settingStore);
const settingLoading = ref(false)
const clearS3Loading = ref(false)
const loginOpacity = ref(0)
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])
const autoCleanDays = ref(0)
const autoCleanExclude = ref([])
const backgroundUrl = ref('')
let backgroundFile = {}
const showSetBackground = ref(false)
let regVerifyCount = ref(1)
let addVerifyCount = ref(1)
const addS3Show = ref(false)
const addVerifyCountShow = ref(false)
const regVerifyCountShow = ref(false)
const resendTokenForm = reactive({
  domain: '',
  token: undefined,
})
const turnstileForm = reactive({
  siteKey: undefined,
  secretKey: undefined
})

const oauthPlatforms = [
  { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
  { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
  { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
]
const oauthSettingShow = ref(false)
const oauthForm = reactive({
  key: '',
  label: '',
  clientId: undefined,
  clientSecret: undefined,
  switch: 1,
})

const s3 = reactive({
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: undefined,
  s3SecretKey: undefined,
  forcePathStyle: 1
})

const noticeForm = reactive({
  noticeTitle: '',
  noticeContent: '',
  noticeType: '',
  noticeDuration: '',
  noticePosition: '',
  noticeOffset: 0,
  notice: 0,
  noticeWidth: 0
})

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

const blackListForm = ref({
  blackSubject: [],
  blackContent: [],
  blackFrom: []
})
const aiCodeFilter = ref([])

const authRefreshOptions = computed(() => [
  {label: t('disable'), value: 0},
  {label: '3s', value: 3},
  {label: '5s', value: 5},
  {label: '10s', value: 10},
  {label: '15s', value: 15},
  {label: '20s', value: 20},
])

const tgChatId = ref([])
const customDomain = ref('')
const tgBotStatus = ref(0)
const tgBotToken = ref()
const forwardEmail = ref([])
const forwardStatus = ref(0)
const webhookUrl = ref('')
const webhookStatus = ref(1)
const webhookRetry = ref(0)
const webhookSecret = ref()
const webhookFormatShow = ref(false)
const webhookPayloadExample = `{
  "emailId": 1,
  "sendEmail": "hello@example.com",
  "sendName": "hello",
  "toEmail": "admin@example.com",
  "toName": "admin",
  "subject": "Hello",
  "text": "Hello",
  "content": "<div>Hello</div>",
  "code": "123456",
  "createTime": "2099-12-30 23:59:59"
}`
const ruleType = ref(0)
const ruleEmail = ref([])
const tgMsgFrom = ref('')
const tgMsgTo = ref('')
const tgMsgText = ref('')

const tgMsgFromOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}, {label: t('onlyName'), value:'only-name'}]
const tgMsgToOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgTextOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgLabelWidth = computed(() => locale.value === 'en' ? '120px' : '100px');

getSettings()

function getSettings() {
  settingReady.value = false
  settingQuery().then(settingData => {
    setting.value = settingData
    settingStore.domainList = settingData.domainList;
    resendTokenForm.domain = setting.value.domainList[0]
    loginOpacity.value = setting.value.loginOpacity
    minEmailPrefix.value = setting.value.minEmailPrefix
    firstLoading.value = false
    backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
    addVerifyCount.value = setting.value.addVerifyCount
    regVerifyCount.value = setting.value.regVerifyCount
    resetNoticeForm()
    resetAddS3Form()
    resetEmailPrefix()
    resetBlackList()
    resetAiCodeFilter()
    nextTick(() => {
      settingReady.value = true
    })
  })
}


function openNoticePopup() {
  uiStore.showNotice()
}

function openAddVerifyCount() {
  if (settingLoading.value) return
  addVerifyCountShow.value = true
}

function openRegVerifyCount() {
  if (settingLoading.value) return
  regVerifyCountShow.value = true
}

function resetAddS3Form() {
  s3.bucket = setting.value.bucket
  s3.endpoint = setting.value.endpoint
  s3.region = setting.value.region
  s3.s3AccessKey = undefined
  s3.s3SecretKey = undefined
  s3.forcePathStyle = setting.value.forcePathStyle
}

const resendList = computed(() => Object.entries(setting.value.resendTokens ?? {})
  .filter(([, value]) => Boolean(value))
  .map(([key]) => ({ key, configured: true })))

function saveAddVerifyCount() {
  if (!addVerifyCount.value) {
    addVerifyCount.value = 1
  }
  editSetting({addVerifyCount: addVerifyCount.value})
}

function saveRegVerifyCount() {
  if (!regVerifyCount.value) {
    regVerifyCount.value = 1
  }
  editSetting({regVerifyCount: regVerifyCount.value})
}

function openTgSetting() {
  tgBotStatus.value = setting.value.tgBotStatus
  tgBotToken.value = undefined
  customDomain.value = setting.value.customDomain
  tgMsgFrom.value = setting.value.tgMsgFrom
  tgMsgText.value = setting.value.tgMsgText
  tgMsgTo.value = setting.value.tgMsgTo
  tgChatId.value = []
  if (setting.value.tgChatId) {
    const list = setting.value.tgChatId.split(',')
    tgChatId.value.push(...list)
  }
  tgSettingShow.value = true
}

function openNoticePopupSetting() {
  noticePopupShow.value = true
}

function openResendList() {
  showResendList.value = true
}

function resetNoticeForm() {
  noticeForm.notice = setting.value.notice
  noticeForm.noticeContent = setting.value.noticeContent
  noticeForm.noticeDuration = setting.value.noticeDuration
  noticeForm.noticeTitle = setting.value.noticeTitle
  noticeForm.noticePosition = setting.value.noticePosition
  noticeForm.noticeType = setting.value.noticeType
  noticeForm.noticeOffset = setting.value.noticeOffset
  noticeForm.noticeWidth = setting.value.noticeWidth
}

function saveNoticePopup() {
  noticeForm.noticeOffset = noticeForm.noticeOffset || 0
  noticeForm.noticeWidth = noticeForm.noticeWidth || 0
  noticeForm.noticeDuration = noticeForm.noticeDuration || 0
  editSetting({...noticeForm})
}

function previewNoticePopup() {
  uiStore.previewNotice({...noticeForm})
}

function openThirdEmailSetting() {
  forwardEmail.value = []
  forwardStatus.value = setting.value.forwardStatus
  if (setting.value.forwardEmail) {
    const list = setting.value.forwardEmail.split(',')
    forwardEmail.value.push(...list)
  }
  thirdEmailShow.value = true
}

function openWebhookSetting() {
  webhookStatus.value = setting.value.webhookStatus
  webhookUrl.value = setting.value.webhookUrl || ''
  webhookRetry.value = setting.value.webhookRetry ?? 0
  webhookSecret.value = undefined
  webhookShow.value = true
}

function openEmailPrefix() {
  emailPrefixShow.value = true
}

function openAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
  autoCleanShow.value = true
}

function openForwardRules() {
  ruleType.value = setting.value.ruleType
  ruleEmail.value = []
  if (setting.value.ruleEmail) {
    const list = setting.value.ruleEmail.split(',')
    ruleEmail.value.push(...list)
  }
  forwardRulesShow.value = true
}

function emailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  forwardEmail.value.splice(forwardEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !forwardEmail.value.includes(email)) {
      forwardEmail.value.push(email)
    }
  })
}

function ruleEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  ruleEmail.value.splice(ruleEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !ruleEmail.value.includes(email)) {
      ruleEmail.value.push(email)
    }
  })
}

function addChatTag(val) {

  const chatIds = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  tgChatId.value.splice(tgChatId.value.length - 1, 1)

  chatIds.forEach(id => {
    if (!isNaN(Number(id))) {
      tgChatId.value.push(id)
    }
  })
}

function clearS3() {

  const form = {
    bucket: '',
    endpoint: '',
    region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    forcePathStyle: 1
  }
  clearS3Loading.value = true
  editSetting(form)
}

function saveS3() {

  const form = {
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    region: s3.region,
    forcePathStyle: s3.forcePathStyle
  }

  if (s3.s3AccessKey) form.s3AccessKey = s3.s3AccessKey
  if (s3.s3SecretKey) form.s3SecretKey = s3.s3SecretKey

  editSetting(form)
}

function tgBotSave() {
  const form = {
    customDomain: customDomain.value,
    tgBotStatus: tgBotStatus.value,
    tgChatId: tgChatId.value + '',
    tgMsgFrom: tgMsgFrom.value,
    tgMsgText: tgMsgText.value,
    tgMsgTo: tgMsgTo.value
  }
  if (tgBotToken.value) form.tgBotToken = tgBotToken.value
  editSetting(form)
}

function forwardEmailSave() {
  const form = {
    forwardStatus: forwardStatus.value,
    forwardEmail: forwardEmail.value + ''
  }
  editSetting(form)
}

function webhookSave() {
  let retry = Number(webhookRetry.value)
  if (isNaN(retry) || retry < 0) {
    retry = 0
  }
  const url = toOssDomain(webhookUrl.value.trim())
  if (isIpUrl(url)) {
    ElMessage({
      message: t('webhookIpNotSupported'),
      type: 'warning',
      plain: true
    })
    return
  }
  const form = {
    webhookStatus: webhookStatus.value,
    webhookUrl: url,
    webhookRetry: retry
  }
  if (webhookSecret.value !== undefined) form.webhookSecret = webhookSecret.value.trim()
  editSetting(form)
}


function ruleEmailSave() {
  const form = {
    ruleEmail: ruleEmail.value + '',
    ruleType: ruleType.value
  }
  editSetting(form)
}

function doOpacityChange() {
  if (!settingReady.value) return
  const form = {}
  form.loginOpacity = loginOpacity.value
  editSetting(form, true)
}

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

function resetBlackList() {
  blackListForm.value.blackFrom = setting.value.blackFrom ? setting.value.blackFrom.split(',') : []
  blackListForm.value.blackContent = setting.value.blackContent ? setting.value.blackContent.split(',') : []
  blackListForm.value.blackSubject = setting.value.blackSubject ? setting.value.blackSubject.split(',') : []
}

function resetAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
}

function resetAiCodeFilter() {
  aiCodeFilter.value = setting.value.aiCodeFilter ? setting.value.aiCodeFilter.split(',') : []
}

function saveEmailPrefix() {
  const form = {}
  form.minEmailPrefix = minEmailPrefix.value
  form.emailPrefixFilter = emailPrefixFilter.value
  editSetting(form, true)
}

function saveAutoClean() {
  editSetting({
    autoCleanDays: autoCleanDays.value,
    autoCleanExclude: autoCleanExclude.value.join(',')
  }, true)
}

function saveAiCodeFilter() {
  editSetting({aiCodeFilter: aiCodeFilter.value + ''})
}

const opacityChange = debounce(doOpacityChange, 1000, {
  leading: false,
  trailing: true
})

function saveBlackList() {

  let form = {
    blackContent: blackListForm.value.blackContent + '',
    blackSubject: blackListForm.value.blackSubject + '',
    blackFrom: blackListForm.value.blackFrom + ''
  }

  settingLoading.value = true

  setBlackList(form).then(() => {
    getSettings()
    ElMessage({
      message: t('setSuccess'),
      type: "success",
      plain: true
    })
    blackFormShow.value = false;
  }).finally(() => {
    settingLoading.value = false;
  })
}

function banEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  blackListForm.value.blackFrom.splice(blackListForm.value.blackFrom.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !blackListForm.value.blackFrom.includes(email)) {
      blackListForm.value.blackFrom.push(email)
    }
  })
}

function autoCleanExcludeAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  autoCleanExclude.value.splice(autoCleanExclude.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !autoCleanExclude.value.includes(email)) {
      autoCleanExclude.value.push(email)
    }
  })
}

function aiCodeFilterAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  aiCodeFilter.value.splice(aiCodeFilter.value.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !aiCodeFilter.value.includes(email)) {
      aiCodeFilter.value.push(email)
    }
  })
}


function delBackground() {
  ElMessageBox.confirm(t('delBackgroundConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    deleteBackground().then(() => {
      backgroundUrl.value = ''
      setting.value.background = null
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  })
}

function openOauthSetting(p) {
  oauthForm.key = p.key
  oauthForm.label = p.label
  oauthForm.clientId = undefined
  oauthForm.clientSecret = undefined
  oauthForm.switch = setting.value[p.key + 'Switch'] ?? 1
  oauthSettingShow.value = true
}

function saveOauth() {
  const form = {}
  if (oauthForm.clientId !== undefined) form[oauthForm.key + 'ClientId'] = oauthForm.clientId
  if (oauthForm.clientSecret !== undefined) form[oauthForm.key + 'ClientSecret'] = oauthForm.clientSecret
  form[oauthForm.key + 'Switch'] = oauthForm.switch
  editSetting(form)
}

function saveTurnstileKey() {
  const settingForm = {}
  if (turnstileForm.siteKey !== undefined) settingForm.siteKey = turnstileForm.siteKey
  if (turnstileForm.secretKey !== undefined) settingForm.secretKey = turnstileForm.secretKey
  if (Object.keys(settingForm).length) editSetting(settingForm)
}

async function saveBackground() {

  if (settingLoading.value) return

  let image = ''

  if (localUpShow.value) {
    image = await fileToBase64(backgroundFile, true);
  } else {
    if (backgroundUrl.value && !backgroundUrl.value.startsWith('http')) {
      ElMessage({
        message: t('imageLinkErrorMsg'),
        type: "error",
        plain: true
      })
      return
    }
    image = backgroundUrl.value
  }
  settingLoading.value = true

  setBackground(image).then(key => {
    setting.value.background = key
    showSetBackground.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    localUpShow.value = false
    backgroundImage.value = ''
  }).finally(() => {
    settingLoading.value = false
  })

}

function openSetBackground() {
  showSetBackground.value = true
}

function openCut() {
  const doc = document.createElement('input')
  doc.setAttribute('type', 'file')
  doc.setAttribute('accept', 'image/*')
  doc.click()
  doc.onchange = async (e) => {
    backgroundFile = e.target.files[0]
    backgroundImage.value = URL.createObjectURL(e.target.files[0])
    localUpShow.value = true
  }
}

function openResendForm() {
  resendTokenFormShow.value = true
}

function openBlackListForm() {
  blackFormShow.value = true
}

function openAiCodeFilter() {
  aiCodeFilterShow.value = true
}

function saveResendToken() {
  if (!resendTokenForm.domain || resendTokenForm.token === undefined) return
  const settingForm = {
    resendTokens: {}
  }
  const domain = resendTokenForm.domain.slice(1)
  settingForm.resendTokens[domain] = resendTokenForm.token
  editSetting(settingForm)
}

function cleanResendTokenForm() {
  resendTokenForm.token = undefined
}

function beforeChange() {
  return settingReady.value && !settingLoading.value
}

function changeField(key, value) {
  if (!beforeChange()) return
  const previous = setting.value[key]
  setting.value[key] = value
  editSetting({ [key]: value }, false, () => {
    setting.value[key] = previous
  })
}

function editSetting(settingForm, refreshStatus = true, onFailure) {
  if (settingLoading.value) return
  settingLoading.value = true

  settingSet(settingForm).then(() => {
    settingLoading.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    if (setting.value.manyEmail === 1) {
      accountStore.currentAccountId = userStore.user.account.accountId;
    }
    if (refreshStatus) {
      getSettings()
    }
    resendTokenFormShow.value = false
    turnstileShow.value = false
    tgSettingShow.value = false
    thirdEmailShow.value = false
    webhookShow.value = false
    forwardRulesShow.value = false
    addVerifyCountShow.value = false
    regVerifyCountShow.value = false
    noticePopupShow.value = false
    addS3Show.value = false
    emailPrefixShow.value = false
    aiCodeFilterShow.value = false
    autoCleanShow.value = false
    oauthSettingShow.value = false
  }).catch(() => {
    onFailure?.()
    loginOpacity.value = setting.value.loginOpacity
  }).finally(() => {
    settingLoading.value = false
    clearS3Loading.value = false
  })
}
</script>

<style scoped lang="scss">
.settings-container {
  container-type: inline-size;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  background: var(--mail-shell-rail);
  position: relative;

}


.background {
  width: min(220px, 45vw);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--mail-radius-control);
  border: 1px solid var(--light-border);
}

.background-btn {
  display: flex;
  gap: 4px;
  flex-direction: column;
}

.bot-verify-select {
  margin-left: 10px;
}

.settings-card {
  min-width: 0;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-card);
  background: var(--el-bg-color);
}

.card-title {
  --heading-radius: calc(var(--mail-radius-card) - 1px);
  padding: 12px 16px;
  border-bottom: 1px solid var(--mail-shell-line);
  border-radius: var(--heading-radius) var(--heading-radius) 0 0;
  background: var(--mail-shell-rail);
  font-size: 14px;
  font-weight: 650;
}

.card-content {
  padding: 0 16px;
}

.setting-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px 16px;
  min-height: 46px;
  padding-block: 8px;
  font-size: 14px;

  & + & {
    border-top: 1px solid var(--mail-shell-line);
  }
}

.setting-item {
  > div:first-child {
    display: flex;
    align-items: center;
    gap: 5px;
    overflow-wrap: anywhere;
  }

  > div:last-child {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  :deep(.opt-button.el-button--small) {
    height: 28px;
    padding-inline: 10px;
  }
}

.setting-item.personalized > div:last-child {
  align-items: flex-start;
}

@container (max-width: 480px) {
  .setting-item.personalized {
    grid-template-columns: 1fr;
  }

  .setting-item.personalized > div:last-child {
    justify-content: flex-start;
  }
}

.credential-form {
  display: grid;
  gap: 12px;
}

.credential-form > .el-button {
  margin-top: 0;
}

.credential-mask {
  color: var(--mail-shell-muted, var(--el-text-color-secondary));
  font-family: monospace;
  letter-spacing: .04em;
}

.token-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oauth-icon {
  width: 22px !important;
  height: 22px !important;
  min-width: 22px;
  flex-shrink: 0;
  margin-right: 2px;
}

.title-icon.warning {
  position: relative;
  top: 2px;
  cursor: pointer;
  margin-left: 2px;
}

.warning {
  margin-left: 2px;
  color: grey;
  cursor: pointer;
}

.cropper {
  border-radius: var(--mail-radius-control);
  border: 1px solid var(--mail-shell-line);
  height: 397px;
  width: 705px;
  @media (max-width: 767px) {
    width: calc(100vw - 60px);
    height: calc((100vw - 60px) * 9 / 16);
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.webhook-footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.webhook-format-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  color: var(--el-color-primary);
  font-size: 13px;
}

.webhook-format-title:hover {
  background: var(--el-fill-color);
}

.webhook-format-title:focus-visible {
  outline: 2px solid var(--el-text-color-secondary);
}

.notice-popup-item {
  margin-top: 15px;
}

.notice-line-item {
  margin-top: 15px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;

  > * {
    width: 100%;
  }

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.background-url {
  width: min(calc(100vw - 70px), 500px);
}


:deep(.el-dialog) {
  width: 400px !important;
}

:deep(.resend-table.el-dialog) {
  width: 500px !important;
}

:deep(.notice-popup.el-dialog) {
  min-height: 300px;
  width: 820px !important;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

:deep(.cut-dialog.el-dialog) {
  width: fit-content !important;
  height: fit-content !important;
}


:deep(.forward-dialog.el-dialog) {
  width: 500px !important;
}

.forward-dialog {
  .forward-head {
    display: flex;
    align-items: center;

    .forward-set-title {
      top: 1px;
      padding-right: 5px;
      position: relative;
      font-size: 16px;
      font-weight: bold;;
    }
  }
}

.error-image {
  background: var(--light-ill);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cut-button {
  padding-top: 15px;
  width: 100%;
  display: flex;
  justify-content: space-between;

  .el-button {
    width: fit-content;
  }
}

.bot-verify {
  display: grid;
  grid-template-columns: 1fr auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.forward-set-body {
  display: flex;
  flex-direction: column;

  .el-switch {
    align-self: end;
  }

  > *:nth-child(-n+2) {
    margin-bottom: 15px;
  }

  .tg-msg-label {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .el-select {
      width: v-bind(tgMsgLabelWidth);
    }
    .el-input-number {
      width: 120px;
    }
  }

  .webhook-format pre {
    margin: 8px 0 0;
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    border-radius: var(--mail-radius-control);
    background: var(--el-fill-color-light);
  }
}

.forward > span {
  color: var(--mail-shell-muted);
}

.opt-button {
  width: fit-content !important;
}

.email-prefix {
  display: flex;
  justify-content: space-between;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

.s3-button {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 15px;

  .el-button {
    margin-left: 0;
  }
}

.r2domain {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;

  .storage-type {
    margin-right: 3px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .el-button {
    width: 48px;
    margin: 0;
  }
}

.personalized {
  align-items: start;
}

.dialog-input {
  margin-bottom: 15px;
}

.force-path-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  .force-path-style-left {
    padding-left: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }
}

.token-item {
  padding-top: 0;

  div:last-child {
    font-weight: normal;
  }
}

form .el-button {
  margin-top: 10px;
  width: 100%;
}

.el-switch {
  height: 28px;
}


:deep(.el-button--small) {
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  height: var(--el-component-size-small);
}

</style>

<style>
.el-popper.is-dark {
}
</style>

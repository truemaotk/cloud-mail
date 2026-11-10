<template>
  <section class="project-help">
    <div class="help-inner">
      <header class="help-intro">
        <h1 class="visually-hidden">{{ $t('project.title') }}</h1>
        <p>{{ $t('project.intro') }}</p>
      </header>

      <div class="help-grid">
        <section class="help-section" aria-labelledby="support-heading" :aria-busy="loading">
          <header class="help-section-header">
            <h2 id="support-heading">{{ $t('project.contacts') }}</h2>
            <el-button v-if="info?.canEdit && !info.unavailable" @click="edit">
              {{ $t('project.edit') }}
            </el-button>
          </header>
          <div v-if="!loading && (loadFailed || info?.unavailable)" class="help-notice">
            {{ $t('project.contactsUnavailable') }}
            <el-button link @click="loadInfo">{{ $t('project.retry') }}</el-button>
          </div>
          <el-skeleton v-if="loading" animated aria-hidden="true">
            <template #template>
              <ul class="contact-list">
                <li v-for="channel in channels" :key="channel">
                  <div class="contact-row">
                    <el-skeleton-item variant="rect" class="contact-icon" />
                    <span class="contact-detail contact-skeleton-detail">
                      <el-skeleton-item variant="text" class="contact-skeleton-name" />
                      <el-skeleton-item variant="text" />
                    </span>
                    <span class="contact-action">
                      <el-skeleton-item variant="rect" class="contact-skeleton-action" />
                    </span>
                  </div>
                </li>
              </ul>
            </template>
          </el-skeleton>
          <ul v-else class="contact-list">
            <li v-for="contact in contacts" :key="contact.channel">
              <component :is="contact.url ? 'a' : contact.value ? 'button' : 'div'"
                         class="contact-row"
                         :href="contact.url || undefined"
                         :target="contact.url ? '_blank' : undefined"
                         :rel="contact.url ? 'noopener noreferrer' : undefined"
                         :type="contact.value && !contact.url ? 'button' : undefined"
                         :aria-label="contact.value && !contact.url ? $t('project.copy', { channel: $t('project.' + contact.channel) }) + ' ' + contact.value : undefined"
                         @click="!contact.url && contact.value && copy(contact.value)">
                <span class="contact-icon"><ContactIcon :name="contact.icon || contact.channel" /></span>
                <span class="contact-detail">
                  <strong>{{ $t('project.' + contact.channel) }}</strong>
                  <span>{{ contact.value || contact.link || (info && !info.unavailable ? $t('project.pending') : '—') }}</span>
                </span>
                <span v-if="contact.url || contact.value" class="contact-action">
                  <NavigationIcon :name="contact.url ? 'chevron' : 'copy'" :size="16" />
                </span>
              </component>
            </li>
          </ul>
        </section>

        <section class="help-section version-section" aria-labelledby="version-heading">
          <header class="help-section-header">
            <h2 id="version-heading">{{ $t('project.updates') }}</h2>
            <NavigationIcon name="version" :size="19" />
          </header>
          <div class="version-panel">
            <span>{{ $t('project.installed') }}</span>
            <strong class="version-number">{{ info ? 'v' + info.version : '—' }}</strong>
            <p v-if="update" class="update-status" role="status">
              {{ $t('project.' + update.status, { tag: update.tag || '' }) }}
            </p>
            <p v-if="update?.status === 'available' && !info?.canUpdate" class="update-note">
              {{ $t('project.manualNote') }}
            </p>
            <div class="version-actions">
              <el-button :type="update?.status === 'available' && info?.canUpdate ? 'default' : 'primary'"
                         :loading="checking" :disabled="updating" @click="check">
                {{ $t('project.check') }}
              </el-button>
              <el-button v-if="update?.status === 'available' && info?.canUpdate" type="primary"
                         :loading="updating" @click="apply">
                {{ $t('project.update') }}
              </el-button>
            </div>
            <a v-if="update?.tag" :href="projectUrl + '/releases/tag/' + encodeURIComponent(update.tag)"
               target="_blank" rel="noopener noreferrer">
              {{ $t('project.details') }} <NavigationIcon name="external" :size="14" />
            </a>
          </div>
        </section>
      </div>

      <nav class="help-links" :aria-label="$t('project.title')">
        <a v-for="link in links" :key="link.path" :href="projectUrl + link.path" target="_blank" rel="noopener noreferrer">
          {{ $t('project.' + link.label) }} <NavigationIcon name="external" :size="14" />
        </a>
      </nav>
    </div>

    <el-dialog v-if="info?.canEdit" v-model="editing" close-icon="MailCloseIcon"
               :title="$t('project.edit')" width="min(540px, calc(100% - 32px))" align-center append-to-body>
      <form class="contact-form" @submit.prevent="save">
        <p>{{ $t('project.editorNote') }}</p>
        <div v-for="channel in channels" :key="channel" class="editor-row">
          <div>
            <label :for="'contact-' + channel">{{ $t('project.' + channel) }}</label>
            <el-input :id="'contact-' + channel" v-model="draft[channel].value" maxlength="320"
                      :placeholder="$t('project.' + channel + 'Hint')" />
          </div>
          <div>
            <label :for="'icon-' + channel">{{ $t('project.icon') }}</label>
            <el-select suffix-icon="MailChevronDown" :id="'icon-' + channel" v-model="draft[channel].icon"
                       :aria-label="$t('project.' + channel) + ' ' + $t('project.icon')">
              <el-option v-for="icon in contactIcons" :key="icon" :value="icon" :label="$t('project.' + icon)">
                <span class="icon-choice"><ContactIcon :name="icon" :size="16" /> {{ $t('project.' + icon) }}</span>
              </el-option>
            </el-select>
          </div>
          <div v-if="channel === 'feishu'" class="editor-link">
            <label for="feishu-invitation">{{ $t('project.feishuInvitation') }}</label>
            <el-input id="feishu-invitation" v-model="draft.feishu.link" maxlength="500" :placeholder="$t('project.feishuInvitationHint')" />
          </div>
        </div>
        <div class="editor-actions">
          <el-button :disabled="saving" @click="editing = false">{{ $t('cancel') }}</el-button>
          <el-button native-type="submit" type="primary" :loading="saving">{{ $t('save') }}</el-button>
        </div>
      </form>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import ContactIcon from './ContactIcon.vue'
import http from '@/axios/index.js'

const { t } = useI18n()
const channels = ['wechat', 'feishu', 'whatsapp', 'blog']
const contactIcons = [...channels, 'link', 'mail']
const links = [
  { label: 'github', path: '' },
  { label: 'releases', path: '/releases' },
]
const info = ref(null)
const contacts = computed(() => channels.map(channel => ({ channel, ...info.value?.contacts[channel] })))
const projectUrl = computed(() => 'https://github.com/' + (info.value?.repository || 'truemaotk/cloud-mail'))
const loading = ref(true)
const loadFailed = ref(false)
const editing = ref(false)
const draft = ref({})
const saving = ref(false)
const update = ref(null)
const checking = ref(false)
const updating = ref(false)
const requestOptions = { timeout: 35_000, noMsg: true }

async function loadInfo() {
  loading.value = true
  loadFailed.value = false
  try {
    info.value = await http.get('/project/info', requestOptions)
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

function edit() {
  draft.value = Object.fromEntries(channels.map(channel => [channel, { ...info.value.contacts[channel] }]))
  editing.value = true
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success(t('copySuccessMsg'))
  } catch {
    ElMessage.error(t('copyFailMsg'))
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const result = await http.put('/project/support', {
      contacts: draft.value, revision: info.value.revision,
    }, requestOptions)
    if (result.status === 'saved') {
      Object.assign(info.value, { contacts: result.contacts, revision: result.revision })
      editing.value = false
      ElMessage.success(t('project.saved'))
    } else {
      ElMessage.error(t('project.' + result.status))
      if (result.status === 'conflict') {
        editing.value = false
        await loadInfo()
      }
    }
  } catch (error) {
    ElMessage.error(t(error.code === 403 ? 'project.forbidden' : 'project.unavailable'))
  } finally {
    saving.value = false
  }
}

async function check() {
  checking.value = true
  try {
    update.value = await http.get('/project/update', requestOptions)
  } catch {
    update.value = { status: 'unavailable' }
  } finally {
    checking.value = false
  }
}

async function apply() {
  if (updating.value || checking.value) return
  const { tag } = update.value
  updating.value = true
  try {
    await ElMessageBox.confirm(t('project.confirm', { tag }), t('project.update'), {
      confirmButtonText: t('project.update'),
      cancelButtonText: t('cancel'),
    })
    const result = await http.post('/project/update', { tag }, requestOptions)
    update.value = { ...result, tag }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      update.value = { status: error.code === 403 ? 'forbidden' : 'unavailable', tag }
    }
  } finally {
    updating.value = false
  }
}

onMounted(loadInfo)
</script>

<style scoped>
.project-help {
  min-height: 0;
  overflow: auto;
  background: transparent;
  color: var(--el-text-color-primary);
}
.help-inner {
  width: min(100%, 960px);
  padding: 12px 0 0;
}
.help-intro { margin-bottom: 16px; }
.help-intro h1 { margin: 0 0 4px; font-size: var(--mac-fs-title); line-height: var(--mac-lh-title); font-weight: 600; }
.help-intro p { margin: 0; color: var(--el-text-color-secondary); }
.help-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: var(--mail-shell-gutter); align-items: start; }
.help-section { min-width: 0; overflow: hidden; border: 1px solid var(--mac-line); border-radius: var(--mail-radius-surface); background: var(--mac-surface); }
.help-section-header { min-height: 58px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.help-section-header h2 { margin: 0; font-size: 15px; font-weight: 650; }
.contact-list { list-style: none; margin: 0; padding: 0; }
.contact-row { width: 100%; min-height: 68px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; border: 0; border-top: 1px solid var(--el-border-color-lighter); background: transparent; text-align: start; color: inherit; text-decoration: none; }
:is(a, button).contact-row { cursor: pointer; }
:is(a, button).contact-row:hover { background: var(--el-fill-color-light); }
:is(a, button).contact-row:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
.contact-list li:last-child .contact-row { border-radius: 0 0 var(--mail-radius-card) var(--mail-radius-card); }
.contact-icon { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 9px; background: var(--el-fill-color-light); }
.contact-detail { display: grid; gap: 3px; min-width: 0; line-height: 19px; }
.contact-detail strong { font-weight: 600; }
.contact-detail span { font-size: 13px; overflow-wrap: anywhere; }
.contact-skeleton-detail { width: min(50%, 156px); }
.contact-skeleton-name { width: 44%; }
.contact-skeleton-action { width: 14px; height: 14px; }
.contact-detail span, .help-notice, .update-note { color: var(--el-text-color-secondary); }
.version-panel a svg, .help-links a svg { display: inline; vertical-align: text-bottom; }
.contact-action { display: grid; place-items: center; flex: none; width: 30px; margin-inline-start: auto; color: var(--el-text-color-secondary); }
.help-notice { margin: 0; padding: 0 16px 12px; font-size: 13px; }
.version-panel { display: grid; gap: 12px; padding: 16px; border-top: 1px solid var(--el-border-color-lighter); font-size: 13px; }
.version-panel > span { color: var(--el-text-color-secondary); }
.version-number { font-size: 22px; font-variant-numeric: tabular-nums; line-height: 1; }
.version-panel p { margin: 0; overflow-wrap: anywhere; }
.version-actions, .help-links { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.version-actions :deep(.el-button + .el-button) { margin: 0; }
.help-links { margin-top: 20px; gap: 18px; font-size: 13px; }
.help-links a, .version-panel a { color: var(--el-text-color-regular); }
.help-links a:hover, .version-panel a:hover { text-decoration: underline; }
.contact-form { display: grid; gap: 14px; }
.contact-form p { margin: 0; color: var(--el-text-color-secondary); }
.editor-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(98px, 124px); gap: 10px; }
.editor-link { grid-column: 1 / -1; }
.editor-row label { display: block; margin-bottom: 4px; font-weight: 500; }
.icon-choice { display: inline-flex; align-items: center; gap: 7px; }
.editor-actions { display: flex; justify-content: end; padding-top: 4px; }
@media (max-width: 690px) {
  .help-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>

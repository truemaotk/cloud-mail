<template>
  <div>
    <div v-for="channel in channels" :key="channel" class="bot-row">
      <span>{{ $t(names[channel]) }}</span>
      <div class="bot-actions">
        <span v-if="bots[channel]?.failed" class="bot-failed">
          {{ $t('chatBotFailedCount', { count: bots[channel].failed }) }}
        </span>
        <span v-else-if="bots[channel]?.configured && !bots[channel]?.enabled" class="bot-muted">
          {{ $t('chatBotPaused') }}
        </span>
        <ConfigStatus v-if="ready" :configured="Boolean(bots[channel]?.configured)" />
        <el-button v-perm="'setting:set'" size="small" :disabled="!ready" @click="open(channel)">
          {{ $t('configure') }}
        </el-button>
      </div>
    </div>
    <el-dialog v-model="visible" :title="$t(names[activeChannel])" width="min(460px, calc(100vw - 32px))"
               append-to-body close-icon="MailCloseIcon" :close-on-click-modal="!busy"
               :close-on-press-escape="!busy" :show-close="!busy">
      <form class="bot-form" @submit.prevent="save">
        <p class="bot-muted">{{ $t('chatBotDescription') }}</p>
        <div class="bot-field">
          <span>{{ $t('chatBotUrl') }}</span>
          <CredentialField v-model="url" :label="$t('chatBotUrl')" :configured="Boolean(active?.configured)"
                           clearable @submit="save" />
          <small v-if="active?.configured && url !== undefined && (active.pending || active.failed)" class="bot-muted">
            {{ $t('chatBotChangeTarget') }}
          </small>
        </div>
        <div v-if="activeChannel === 'feishu'" class="bot-field">
          <span>{{ $t('chatBotSecret') }}</span>
          <CredentialField v-model="secret" :label="$t('chatBotSecret')" :configured="url === undefined && Boolean(active?.signed)"
                           clearable @submit="save" />
        </div>
        <div class="bot-toggle">
          <span>{{ $t('chatBotEnable') }}</span>
          <el-switch v-model="enabled" :aria-label="$t('chatBotEnable')" :disabled="!hasAddress" />
        </div>
        <div v-if="active?.pending || active?.failed" class="bot-toggle bot-muted" aria-live="polite">
          <span>{{ $t('chatBotDeliveryCount', { pending: active.pending, failed: active.failed }) }}</span>
          <el-button v-if="active.failed" size="small" :disabled="busy || dirty || !active.enabled" @click="retry">
            {{ $t('chatBotRetry') }}
          </el-button>
        </div>
      </form>
      <template #footer>
        <div class="bot-actions">
          <el-button :loading="busy === 'test'" :disabled="!active?.configured || dirty || Boolean(busy)" @click="test">
            {{ $t('chatBotTest') }}
          </el-button>
          <el-button type="primary" :loading="busy === 'save'" :disabled="!dirty || Boolean(busy)" @click="save">
            {{ $t('save') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import http from '@/axios/index.js'
import ConfigStatus from '@/components/config-status/index.vue'
import CredentialField from '@/components/credential-field/index.vue'

const { t } = useI18n()
const channels = ['feishu', 'wecom']
const names = { feishu: 'chatBotFeishu', wecom: 'chatBotWeCom' }
const bots = ref({})
const ready = ref(false)
const activeChannel = ref('feishu')
const active = computed(() => bots.value[activeChannel.value])
const visible = ref(false)
const busy = ref('')
const url = ref()
const secret = ref()
const enabled = ref(false)
const hasAddress = computed(() => url.value === undefined ? Boolean(active.value?.configured) : Boolean(url.value.trim()))
const dirty = computed(() => url.value !== undefined || secret.value !== undefined || enabled.value !== Boolean(active.value?.enabled))

watch(hasAddress, value => { if (!value) enabled.value = false })
onMounted(load)

async function load() {
  try {
    bots.value = await http.get('/setting/chatBots/status')
    ready.value = true
    return true
  } catch {
    return false
  }
}

async function open(channel) {
  if (!await load()) return
  activeChannel.value = channel
  url.value = undefined
  secret.value = undefined
  enabled.value = Boolean(active.value?.enabled)
  visible.value = true
}

async function save() {
  if (busy.value || !dirty.value) return
  busy.value = 'save'
  try {
    bots.value = await http.put('/setting/chatBots/save/' + activeChannel.value, {
      url: url.value,
      secret: secret.value,
      enabled: enabled.value,
    })
    url.value = undefined
    secret.value = undefined
    ElMessage.success(t('chatBotSaved'))
  } catch {
    // The request layer displays errors.
  } finally {
    busy.value = ''
  }
}

async function test() {
  if (busy.value || dirty.value) return
  busy.value = 'test'
  try {
    await http.post('/setting/chatBots/test/' + activeChannel.value)
    ElMessage.success(t('chatBotTestSent'))
  } catch {
    // The request layer displays errors.
  } finally {
    busy.value = ''
  }
}

async function retry() {
  if (busy.value || dirty.value) return
  busy.value = 'retry'
  try {
    bots.value = await http.post('/setting/chatBots/retry/' + activeChannel.value)
  } catch {
    // The request layer displays errors.
  } finally {
    busy.value = ''
  }
}
</script>

<style scoped>
.bot-row, .bot-toggle, .bot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bot-row, .bot-toggle {
  justify-content: space-between;
}

.bot-row {
  min-height: 46px;
  padding-block: 8px;
  border-bottom: 1px solid var(--mail-shell-line);
}

.bot-row:first-child {
  border-top: 1px solid var(--mail-shell-line);
}

.bot-row .el-button {
  height: 28px;
  padding-inline: 10px;
}

.bot-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.bot-actions .el-button {
  margin: 0;
}

.bot-form {
  display: grid;
  gap: 16px;
}

.bot-field {
  display: grid;
  gap: 6px;
}

.bot-muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.bot-failed {
  color: var(--el-color-danger);
  font-size: 12px;
}
</style>

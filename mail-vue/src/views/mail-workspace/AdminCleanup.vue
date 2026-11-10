<template>
  <el-dialog v-model="open" close-icon="MailCloseIcon" :title="$t('clearEmail')"
             width="min(420px, calc(100vw - 32px))" append-to-body @closed="reset">
    <form id="admin-mail-cleanup" class="cleanup-form" @submit.prevent="submit">
      <el-input v-model="fields.sendName" :aria-label="$t('sender')" :placeholder="$t('sender')" />
      <el-input v-model="fields.subject" :aria-label="$t('subject')" :placeholder="$t('subject')" />
      <el-input v-model="fields.sendEmail" :aria-label="$t('sendEmailAddress')" :placeholder="$t('sendEmailAddress')" />
      <el-input v-model="fields.toEmail" :aria-label="$t('toEmail')" :placeholder="$t('toEmail')" />
      <el-date-picker v-model="dates" type="daterange" unlink-panels :range-separator="$t('to')" />
      <el-select v-model="fields.type" suffix-icon="MailChevronDown">
        <el-option :label="$t('equal')" value="eq" />
        <el-option :label="$t('leading')" value="left" />
        <el-option :label="$t('include')" value="include" />
      </el-select>
    </form>
    <template #footer>
      <el-button @click="open = false">{{ $t('cancel') }}</el-button>
      <el-button type="primary" form="admin-mail-cleanup" native-type="submit" :disabled="!hasFilters" :loading="busy">
        {{ $t('clear') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { allEmailBatchDelete } from '@/request/all-email.js'
import { toUtc } from '@/utils/day.js'

const emit = defineEmits(['change'])
const { t } = useI18n()
const open = defineModel({ type: Boolean, required: true })
const busy = ref(false)
const dates = ref(null)
const defaults = { sendName: '', subject: '', sendEmail: '', toEmail: '', type: 'eq' }
const fields = reactive({ ...defaults })
const hasFilters = computed(() => !!(fields.sendName || fields.subject || fields.sendEmail || fields.toEmail || dates.value?.length))

function reset() {
  Object.assign(fields, defaults)
  dates.value = null
}

async function submit() {
  if (busy.value || !hasFilters.value) return
  const params = { ...fields }
  if (dates.value?.length) {
    params.startTime = toUtc(dates.value[0]).format('YYYY-MM-DD HH:mm:ss')
    params.endTime = toUtc(dates.value[1]).add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  }
  busy.value = true
  try {
    await ElMessageBox.confirm(t('delAllConfirm'), {
      confirmButtonText: t('confirm'), cancelButtonText: t('cancel'), type: 'warning',
    })
    await allEmailBatchDelete(params)
    open.value = false
    emit('change')
    ElMessage.success(t('clearSuccess'))
  } catch {
    // The request layer reports failures.
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.cleanup-form { display: grid; gap: 12px; }
.cleanup-form :deep(.el-date-editor) { width: 100%; }
</style>

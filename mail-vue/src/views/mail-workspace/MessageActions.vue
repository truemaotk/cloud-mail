<template>
  <div class="message-actions">
    <template v-if="!trashFolder">
      <span v-if="reader && canReply" class="toolbar-group">
      <ToolbarButton icon="reply" :label="$t('reply')" @click="$emit('reply')" />
      <ToolbarButton icon="forward" :label="$t('forward')" @click="$emit('forward')" />
      </span>
      <span class="toolbar-group">
      <ToolbarButton v-if="folder === 'archived' || folder === 'snoozed' || folder === 'spam'"
                     icon="restore" :label="$t(folder === 'spam' ? 'mailNotSpam' : 'mailInboxAction')"
                     :disabled="working" @click="move('inbox')" />
      <ToolbarButton v-else-if="canFile" icon="archive" :label="$t('mailArchiveAction')" :disabled="working" @click="move('archived')" />
      <ToolbarButton v-if="canFile && folder !== 'spam'" icon="spam" :label="$t('mailSpamAction')"
                     :disabled="working" @click="move('spam')" />
      <ToolbarButton v-if="canDelete" icon="delete" :label="$t('mailTrashAction')"
                     :disabled="working" @click="move('trash')" />
      </span>
      <span class="toolbar-group">
      <ToolbarButton :icon="reader ? 'mail' : 'mark-read'"
                     :label="$t(reader ? 'mailMarkedUnread' : 'markAsRead')" :disabled="working"
                     @click="mark(reader)" />
      <el-dropdown trigger="click" placement="bottom-end" :show-arrow="false" @command="selectAction">
        <ToolbarButton icon="more" :label="$t('mailMoreActions')" :disabled="working" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="canFile && folder !== 'spam'" command="snooze">
              <NavigationIcon name="mail-delay" :size="16" />{{ $t('mailSnoozed') }}
            </el-dropdown-item>
            <el-dropdown-item v-if="folder === 'snoozed' || folder === 'spam'" command="archive">
              <NavigationIcon name="archive" :size="16" />{{ $t('mailArchiveAction') }}
            </el-dropdown-item>
            <el-dropdown-item :command="reader ? 'read' : 'unread'">
              <NavigationIcon :name="reader ? 'mark-read' : 'mail'" :size="16" />
              {{ $t(reader ? 'markAsRead' : 'mailMarkedUnread') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      </span>
    </template>
    <template v-else-if="canDelete">
      <ToolbarButton icon="restore" :label="$t('mailRestoreAction')" :disabled="working" @click="move('restore')" />
      <ToolbarButton icon="delete" :label="$t('mailPurge')" :disabled="working" @click="move('purge')" />
    </template>

    <el-dialog v-model="snoozeOpen" :title="$t('mailSnoozed')" width="min(400px, calc(100vw - 32px))" append-to-body>
      <div class="snooze-options">
        <el-button :disabled="working" @click="move('snoozed', Date.now() + 3600000)">{{ $t('mailLaterToday') }}</el-button>
        <el-button :disabled="working" @click="snoozeTomorrow">{{ $t('mailTomorrow') }}</el-button>
      </div>
      <label class="snooze-label" for="mail-snooze-time">{{ $t('mailPickTime') }}</label>
      <el-date-picker id="mail-snooze-time" v-model="snoozeDate" type="datetime"
                      :placeholder="$t('mailSnoozeUntil')" :teleported="false" />
      <template #footer>
        <el-button @click="snoozeOpen = false">{{ $t('cancel') }}</el-button>
        <el-button type="primary" :disabled="!snoozeDate" :loading="working"
                   @click="move('snoozed', snoozeDate?.getTime())">{{ $t('confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { emailRead, workspaceMove } from '@/request/email.js'
import { hasPerm } from '@/perm/perm.js'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import ToolbarButton from '@/components/toolbar-button/index.vue'

const props = defineProps({ folder: String, ids: Array, reader: Boolean, canReply: Boolean, canFile: Boolean })
const emit = defineEmits(['change', 'reply', 'forward'])
const { t } = useI18n()
const trashFolder = computed(() => props.folder === 'trash')
const canDelete = computed(() => hasPerm('email:delete'))
const working = ref(false)
const snoozeOpen = ref(false)
const snoozeDate = ref(null)

function selectAction(action) {
  if (action === 'snooze') {
    snoozeDate.value = null
    snoozeOpen.value = true
  } else if (action === 'archive') {
    move('archived')
  } else {
    mark(action === 'unread')
  }
}

function snoozeTomorrow() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  move('snoozed', tomorrow.getTime())
}

async function move(action, until) {
  if (working.value || !props.ids.length) return
  if (action === 'snoozed' && !(until > Date.now())) {
    ElMessage.warning(t('mailSnoozeInvalid'))
    return
  }
  const ids = [...props.ids]
  working.value = true
  try {
    if (action === 'purge') {
      await ElMessageBox.confirm(t('mailPurgeConfirm'), {
        confirmButtonText: t('mailPurge'), cancelButtonText: t('cancel'), type: 'warning',
      })
    }
    await workspaceMove(action, ids, until)
    snoozeOpen.value = false
    emit('change', { ids, action })
    ElMessage.success(t('mailMoveSuccess'))
  } catch {
    // The request layer shows network and permission errors.
  } finally {
    working.value = false
  }
}

async function mark(unread) {
  if (working.value || !props.ids.length) return
  const ids = [...props.ids]
  working.value = true
  try {
    await emailRead(ids, unread)
    emit('change', { ids, action: unread ? 'unread' : 'read' })
  } catch {
    // The request layer shows the error.
  } finally {
    working.value = false
  }
}
</script>

<style scoped>
.message-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.message-actions > .toolbar-group + .toolbar-group { margin-inline-start: 0; }
.snooze-options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.snooze-options .el-button + .el-button { margin: 0; }
.snooze-label { display: block; margin-bottom: 6px; }
</style>

<template>
  <el-dialog v-model="open" :title="title" width="min(420px, calc(100vw - 28px))" append-to-body
             close-icon="MailCloseIcon" :show-close="!busy" :close-on-click-modal="!busy" :close-on-press-escape="!busy" @closed="onClosed">
    <template v-if="editing">
      <form class="label-form" @submit.prevent="saveDefinition">
        <label for="mail-label-name">{{ t('mailLabelName') }}</label>
        <el-input id="mail-label-name" v-model="name" maxlength="40" :disabled="busy" />
        <fieldset class="label-colors" :disabled="busy">
          <legend>{{ t('mailLabelColor') }}</legend>
          <label v-for="(swatch, key) in labelColors" :key="key" class="label-color" :style="{ '--tag-color': swatch }">
            <input v-model="color" name="mail-label-color" type="radio" :value="key" :aria-label="t(`mailLabelColors.${key}`)" />
            <span aria-hidden="true" />
          </label>
        </fieldset>
      </form>
    </template>
    <template v-else-if="context">
      <ul v-if="available.length" class="label-options">
        <li v-for="label in available" :key="label.id">
          <button v-if="context.manage" class="label-manager-link" type="button" :disabled="busy" @click="goToLabel(label)">
            <span class="label-option-dot" :style="{ backgroundColor: labelColors[label.color] }" aria-hidden="true" />
            {{ label.name }}
          </button>
          <el-checkbox v-else :model-value="current(label.id) === true" :indeterminate="current(label.id) === null"
                       :disabled="busy" @change="changed.set(label.id, $event)">
            <span class="label-option-dot" :style="{ backgroundColor: labelColors[label.color] }" aria-hidden="true" />
            {{ label.name }}
          </el-checkbox>
          <ToolbarButton icon="compose" :label="t('mailEditLabelNamed', { name: label.name })" :disabled="busy" @click="startEditing(label)" />
        </li>
      </ul>
      <p v-else class="label-empty">{{ t('mailLabelsEmpty') }}</p>
    </template>
    <template #footer>
      <div class="label-dialog-actions">
        <el-button v-if="editing && definition" type="danger" plain :disabled="busy" @click="removeDefinition">{{ t('delete') }}</el-button>
        <el-button v-if="!editing && !context?.manage" :disabled="busy" @click="startEditing(null)">{{ t('mailNewLabel') }}</el-button>
        <span class="label-footer-space" />
        <el-button :disabled="busy" @click="cancel">{{ t('cancel') }}</el-button>
        <el-button v-if="editing" type="primary" :disabled="!name.trim()" :loading="busy" @click="saveDefinition">{{ t('save') }}</el-button>
        <el-button v-else-if="context?.manage" type="primary" @click="startEditing(null)">{{ t('mailNewLabel') }}</el-button>
        <el-button v-else type="primary" :disabled="!changed.size" :loading="busy" @click="saveAssignments">{{ t('mailApplyLabels') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import ToolbarButton from '@/components/toolbar-button/index.vue'
import { assignLabels, deleteLabel, saveLabel } from '@/request/labels.js'
import { labelColors, useLabelsStore } from '@/store/labels.js'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useLabelsStore()
const open = ref(false)
const context = shallowRef(null)
const definition = shallowRef(null)
const editing = ref(false)
const busy = ref(false)
const name = ref('')
const color = ref('gray')
const changed = reactive(new Map())
const available = computed(() => store.labels.filter(label => label.kind === context.value?.kind))
const title = computed(() => {
  if (editing.value) return t(definition.value ? 'mailEditLabel' : 'mailNewLabel')
  if (context.value?.manage) return t('mailManageLabels')
  return t(context.value?.kind === 'mailbox' ? 'mailboxLabels' : 'mailMessageLabels')
})

watch(() => store.dialog, dialog => {
  if (!dialog) return
  context.value = dialog
  changed.clear()
  editing.value = false
  if (!dialog.manage && !dialog.items.length) startEditing(dialog.label)
  open.value = true
})

function startEditing(label) {
  definition.value = label
  name.value = label?.name ?? ''
  color.value = label?.color ?? 'gray'
  editing.value = true
}

function current(id) {
  if (changed.has(id)) return changed.get(id)
  const items = context.value?.items ?? []
  const applied = items.filter(item => item.labelIds.includes(id)).length
  return !applied ? false : applied === items.length ? true : null
}

function cancel() {
  if (editing.value && (context.value.items.length || context.value.manage)) editing.value = false
  else open.value = false
}

function onClosed() {
  if (open.value) return
  context.value = null
  store.dialog = null
}

function goToLabel(label) {
  open.value = false
  router.push({ name: 'email', query: { label: label.id } })
}

async function saveDefinition() {
  if (busy.value || !name.value.trim()) return
  busy.value = true
  try {
    const label = await saveLabel({ id: definition.value?.id, kind: context.value.kind, name: name.value, color: color.value })
    if (!definition.value && context.value.items.length) changed.set(label.id, true)
    await store.load()
    cancel()
  } catch {
    // The request layer displays validation and server errors.
  } finally {
    busy.value = false
  }
}

async function removeDefinition() {
  if (busy.value || !definition.value) return
  busy.value = true
  try {
    const { id, name } = definition.value
    await ElMessageBox.confirm(t('mailDeleteLabelPrompt', { name }), { type: 'warning' })
    await deleteLabel(id)
    changed.delete(id)
    if (Number(route.query.label) === id) await router.replace({ name: 'email' })
    await store.load()
    cancel()
  } catch {
    // Cancellation leaves the label in place.
  } finally {
    busy.value = false
  }
}

async function saveAssignments() {
  if (busy.value || !changed.size) return
  const { kind, items } = context.value
  const itemIds = items.map(item => item.id)
  const add = [], remove = []
  for (const [id, selected] of changed) (selected ? add : remove).push(id)
  busy.value = true
  try {
    await assignLabels({ kind, itemIds, add, remove })
    if (kind === 'mailbox') await store.load()
    else store.lastMessageChange = { itemIds, add, remove }
    open.value = false
  } catch {
    // Preserve the draft selection so the user can retry.
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.label-form { display: grid; gap: 8px; }
.label-colors { border: 0; margin: 6px 0 0; padding: 0; display: flex; gap: 6px; flex-wrap: wrap; }
.label-colors legend { margin-bottom: 5px; }
.label-color { position: relative; display: grid; width: 30px; height: 30px; place-items: center; }
.label-color input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.label-color span, .label-option-dot { display: inline-block; border-radius: 4px; width: 14px; height: 14px; }
.label-color span { background: var(--tag-color); pointer-events: none; }
.label-color input:is(:focus-visible, :checked) + span { outline: 2px solid var(--mac-focus); outline-offset: 3px; }
.label-options { list-style: none; margin: 0 0 8px; padding: 0; max-height: 230px; overflow: auto; }
.label-options li { display: flex; align-items: center; justify-content: space-between; gap: 5px; padding: 3px 0; }
.label-manager-link { min-width: 0; min-height: 30px; padding: 4px 6px; border: 0; border-radius: 6px; background: transparent; color: inherit; text-align: start; cursor: pointer; overflow-wrap: anywhere; }
.label-manager-link:hover { background: var(--mail-shell-hover); }
.label-option-dot { width: 10px; height: 10px; margin-inline-end: 4px; }
.label-empty { color: var(--mac-text-2); margin-bottom: 6px; }
.label-dialog-actions { display: flex; align-items: center; gap: 8px; }
.label-footer-space { flex: 1; }
.label-dialog-actions .el-button + .el-button { margin-left: 0; }
@media (max-width: 420px) {
  .label-dialog-actions { gap: 6px; }
  .label-dialog-actions .el-button { padding-inline: 8px; }
}
</style>

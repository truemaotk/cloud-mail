<template>
  <div class="credential-field">
    <el-input
      type="password"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
      data-form-type="other"
      data-lpignore="true"
      data-1p-ignore
      :aria-label="label"
      :model-value="value ?? ''"
      :placeholder="configured && value === undefined ? '********' : label"
      @update:model-value="value = $event || undefined"
      @keyup.enter="$emit('submit')"
    />
    <el-button v-if="configured && clearable && !value" size="small" type="button"
               :aria-label="label + ' · ' + $t(value === '' ? 'undoClearCredential' : 'clearCredential')"
               @click="value = value === '' ? undefined : ''">
      {{ $t(value === '' ? 'undoClearCredential' : 'clearCredential') }}
    </el-button>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  configured: Boolean,
  clearable: Boolean,
})
defineEmits(['submit'])

// Undefined retains the stored value. An explicit empty string clears it.
const value = defineModel()
</script>

<style scoped>
.credential-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.credential-field :deep(.el-input) {
  min-width: 0;
}

.credential-field :deep(.el-button) {
  flex-shrink: 0;
  width: auto;
  margin: 0;
}
</style>

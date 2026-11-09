<template>
  <div class="login-field">
    <label :for="id">{{ $t('emailAccount') }}</label>
    <el-input
      :id="id"
      v-model="email"
      :class="{ 'email-input': !fullAddress && domains.length }"
      :placeholder="!fullAddress && domains.length ? $t('loginEmailPrefix') : $t('emailAccount')"
      :inputmode="!fullAddress && domains.length ? 'text' : 'email'"
      autocomplete="username"
      autocapitalize="none"
      :spellcheck="false"
    >
      <template v-if="!fullAddress && domains.length" #append>
        <el-select suffix-icon="MailChevronDown"
          v-if="domains.length > 1"
          v-model="suffix"
          class="login-domain-select"
          :aria-label="$t('loginEmailDomain')"
          :placeholder="$t('select')"
          popper-class="cloud-mail-login-domains"
        >
          <el-option v-for="domain in domains" :key="domain" :label="domain" :value="domain" />
        </el-select>
        <span v-else class="login-domain-text" :title="suffix">{{ suffix }}</span>
      </template>
    </el-input>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, required: true },
  domains: { type: Array, required: true },
  fullAddress: Boolean,
})

const email = defineModel({ type: String, required: true })
const suffix = defineModel('suffix', { type: String, required: true })
</script>

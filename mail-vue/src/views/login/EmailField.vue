<template>
  <div class="login-field" :style="{ '--domain-width': domainWidth }">
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
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  domains: { type: Array, required: true },
  fullAddress: Boolean,
})

const email = defineModel({ type: String, required: true })
const suffix = defineModel('suffix', { type: String, required: true })
// 后缀宽度按最长域名的字符数计算（下拉多留箭头位置），前缀自动拿剩余宽度
const domainWidth = computed(() => {
  const longest = Math.max(0, ...props.domains.map(domain => String(domain).length + 1))
  // 单个域名时后缀按文字实际宽度收紧（auto），多个域名的下拉按最长域名留宽
  return props.domains.length > 1 ? `calc(${longest} * .6em + 40px)` : 'auto'
})
</script>

<template>
  <span class="config-status" :class="{ 'is-configured': configured }">
    {{ $t(configured ? 'configured' : 'notConfigured') }}
  </span>
</template>

<script setup>
defineProps({ configured: Boolean })
</script>

<style scoped>
.config-status {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 2px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.config-status.is-configured {
  border-color: #c9e6d2;
  background: #e8f5eb;
  color: #235c3d;
}

:global(.dark) .config-status.is-configured {
  border-color: #345c46;
  background: #253d30;
  color: #b1e2be;
}
</style>

<template>
  <span v-if="count > 0" class="unread-badge" role="img" :aria-label="label || $t('unreadMessages', { count })"
        :title="label || $t('unreadMessages', { count })">
    {{ count > 99 ? '99+' : count }}
  </span>
</template>

<script setup>
defineProps({ count: { type: Number, default: 0 }, label: String })
</script>

<style scoped>
.unread-badge {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 19px;
  padding-inline: 5px;
  border-radius: 6px;
  background: var(--mail-shell-badge);
  color: var(--mail-shell-badge-text);
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
</style>

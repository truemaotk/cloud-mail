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
  height: 18px;
  padding-inline: 6px;
  border-radius: 9px;
  background: var(--mail-shell-badge);
  color: var(--mail-shell-badge-text);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
[aria-current='page'] > .unread-badge {
  background: color-mix(in srgb, var(--mac-accent) 18%, var(--mac-surface));
  color: var(--mac-selected-text);
}
</style>

<template>
  <div class="percent">
    <NavigationIcon name="loading" class="mail-spinner" />
    <div>
      <span>{{value}}%</span>
      <span style="margin-left: 5px">{{desc}}</span>
    </div>
  </div>
</template>
<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
defineProps({
  value: [Number,String],
  desc: [String]
})
</script>

<style scoped lang="scss">
.percent {
  display: flex;
  gap: 10px;
}
</style>
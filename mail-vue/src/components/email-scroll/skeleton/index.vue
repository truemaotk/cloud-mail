<template>
  <div v-for="item in rows" aria-hidden="true" style="background: var(--el-bg-color)">
    <div :class="'email-row ' + type ">
      <el-checkbox disabled class="selection-control row-select"
      ></el-checkbox>
      <ToolbarButton v-if="showStar" class="row-star" icon="star" :label="$t('star')" disabled />
      <div class="title">

        <div class="email-sender">
          <div class="email-status" v-if="showStatus"></div>
          <span class="name">
             <span>
               <el-skeleton animated>
                 <template #template>
                   <el-skeleton-item variant="text" class="name-skeleton"/>
                 </template>
               </el-skeleton>
             </span>
             <span></span>
          </span>
          <span class="phone-time">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="text" style="width: 50px;height: 1rem;"/>
              </template>
            </el-skeleton>
          </span>
        </div>
        <div class="message-info">
          <div class="email-text-skeleton">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="text" class="text-skeleton-one"/>
                <el-skeleton-item variant="text" class="text-skeleton-two"/>
              </template>
            </el-skeleton>
          </div>
        </div>
      </div>
      <div class="user-info" v-if="showUserInfo">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: min(140px, 100%); height: 14px;" />
          </template>
        </el-skeleton>
      </div>
      <div class="email-right-skeleton">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 60px;margin-right: 15px;height: 1rem;"/>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>
<script setup>
import ToolbarButton from '@/components/toolbar-button/index.vue'
defineProps({
  rows: {
    type: Number,
    default: 1
  },
  showStar: {
    type: Boolean,
    default: true
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: ''
  }
})
</script>

<style scoped lang="scss">

:deep(.el-skeleton__item) {
  position: relative;
  top: 2px;
}

</style>

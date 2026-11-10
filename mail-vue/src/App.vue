<template>
  <el-config-provider :locale="settingStore.lang === 'zh' ? zhCn : null" :dialog="dialogDefaults">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
const dialogDefaults = { alignCenter: true }
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
import {useUiStore} from "@/store/ui.js";
const uiStore = useUiStore()
watch(() => uiStore.palette, (palette) => {
  document.documentElement.dataset.palette = palette || 'graphite'
}, { immediate: true })
const { locale } = useI18n()
locale.value = settingStore.lang
watch(() => settingStore.lang, () => locale.value = settingStore.lang)
</script>

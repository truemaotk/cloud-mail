<template>
  <el-config-provider :locale="settingStore.lang === 'zh' ? zhCn : null" :dialog="dialogDefaults">
    <router-view />
    <InstantTooltip />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import InstantTooltip from '@/components/instant-tooltip/index.vue'
import { watch, onBeforeUnmount } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
const dialogDefaults = { alignCenter: true }
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import('@/icons/index.js')
import {useUiStore} from "@/store/ui.js";
import { getPalette } from '@/utils/palettes.js'
const uiStore = useUiStore()
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const updateSystemMotion = () => { uiStore.systemReducedMotion = motionQuery.matches }
motionQuery.addEventListener('change', updateSystemMotion)
onBeforeUnmount(() => motionQuery.removeEventListener('change', updateSystemMotion))
watch(() => uiStore.reduceMotion, reduce => {
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full'
}, { immediate: true })
watch(() => uiStore.palette, (palette) => {
  const selected = getPalette(palette)
  const root = document.documentElement
  root.dataset.palette = selected.key
  root.style.setProperty('--pal', selected.light)
  root.style.setProperty('--pal-dark', selected.dark)
  root.style.setProperty('--pal-swatch', selected.tint || selected.swatch)
}, { immediate: true })
const { locale } = useI18n()
locale.value = settingStore.lang
watch(() => settingStore.lang, (lang) => {
  locale.value = lang
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
}, { immediate: true })
</script>

<template>
  <img v-if="logos[name]" :src="logos[name]" :width="size" :height="size" alt="" />
  <NavigationIcon v-else :name="name === 'mail' ? 'mail' : 'link'" :size="size" />
</template>

<script setup>
import NavigationIcon from '@/components/navigation-icon/index.vue'
import wechat from './icons/wechat.svg'
import feishu from './icons/feishu.svg'
import whatsapp from './icons/whatsapp.svg'
import blog from './icons/blog.svg'

defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 22 },
})

const logos = { wechat, feishu, whatsapp, blog }
</script>

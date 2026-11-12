<template>
  <div class="content-box" ref="contentBox">
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  html: {
    type: String,
    required: true
  }
})

const container = ref(null)
const contentBox = ref(null)
let shadowRoot = null
let resizeObserver
let resizeFrame
let observedWidth = 0

function updateContent() {
  if (!shadowRoot) return;

  // 1. 提取 <body> 的 style 属性（如果存在）
  const bodyStyleRegex = /<body[^>]*style="([^"]*)"[^>]*>/i;
  const bodyStyleMatch = props.html.match(bodyStyleRegex);
  const bodyStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

  // 2. 移除 <body> 标签（保留内容）
  const cleanedHtml = props.html.replace(/<\/?body[^>]*>/gi, '');
  // Simple messages follow the app theme. Designed HTML mail keeps a light
  // paper base so its explicit dark text and branded colors remain readable.
  const authoredColors = /<style\b|(?:color|background)\s*:|\b(?:bgcolor|text)\s*=/i.test(props.html);
  const paper = authoredColors ? '#FAFAFC' : 'var(--mac-surface, #FAFAFC)';
  const ink = authoredColors ? '#1D1D1F' : 'var(--mac-text, #1D1D1F)';

  // 3. 将 body 的 style 应用到 .shadow-content
  shadowRoot.innerHTML = `
    <style>
      :host {
        all: initial;
        width: 100%;
        height: 100%;
        font-family: var(--mac-font, system-ui, sans-serif);
        font-size: 15px;
        line-height: 1.6;
        color: ${ink};
        word-break: break-word;
      }

      h1, h2, h3, h4 {
          font-size: 18px;
          font-weight: 700;
      }

      p {
        margin: 0;
      }

      a {
        text-decoration: underline;
        text-underline-offset: 2px;
        color: ${authoredColors ? '#386080' : 'var(--mac-link, #386080)'};
      }

      .shadow-content {
        background: ${paper};
        width: fit-content;
        height: fit-content;
        min-width: 100%;
        ${bodyStyle ? bodyStyle : ''} /* 注入 body 的 style */
      }

      img:not(table img) {
        max-width: 100%;
        height: auto !important;
      }

    </style>
    <div class="shadow-content">
      ${cleanedHtml}
    </div>
  `;
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return

  const parent = contentBox.value
  const shadowContent = shadowRoot.querySelector('.shadow-content')

  if (!shadowContent) return

  shadowRoot.host.style.zoom = 1
  const parentWidth = parent.clientWidth
  const childWidth = shadowContent.scrollWidth

  if (childWidth === 0) return

  const scale = Math.min(1, parentWidth / childWidth)

  const hostElement = shadowRoot.host
  hostElement.style.zoom = scale
}

function scheduleScale() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(autoScale)
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'open' })
  updateContent()
  scheduleScale()
  shadowRoot.addEventListener('load', scheduleScale, true)
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== observedWidth) {
      observedWidth = entry.contentRect.width
      scheduleScale()
    }
  })
  resizeObserver.observe(contentBox.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(resizeFrame)
  resizeObserver?.disconnect()
  shadowRoot?.removeEventListener('load', scheduleScale, true)
})

watch(() => props.html, () => {
  updateContent()
  scheduleScale()
})
</script>

<style scoped>
.content-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

.content-html {
  width: 100%;
  height: 100%;
}
</style>

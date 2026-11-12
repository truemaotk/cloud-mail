<template>
  <Teleport to="body">
    <div v-if="hint" id="mail-instant-tooltip" ref="panel" role="tooltip" class="mail-instant-tooltip"
         :class="{ 'is-rail-bubble': position.rail }"
         :style="{ left: position.x + 'px', top: position.y + 'px', '--tip-arrow-y': position.arrow + 'px', visibility: position.ready ? 'visible' : 'hidden' }">
      {{ hint }}
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const hint = ref('')
const panel = ref(null)
const position = reactive({ x: 0, y: 0, ready: false, rail: false, arrow: 14 })
const route = useRoute()
const selector = '[data-tooltip], [data-rail-label], [title], button[aria-label], a[aria-label], .nav-main, .nav-child, .nav-group-toggle, .section-link, .el-dialog__headerbtn'
let anchor
let generation = 0

function hide() {
  generation++
  if (anchor) {
    const ids = (anchor.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== 'mail-instant-tooltip')
    if (ids.length) anchor.setAttribute('aria-describedby', ids.join(' '))
    else anchor.removeAttribute('aria-describedby')
  }
  anchor = undefined
  hint.value = ''
  position.ready = false
}

async function show(event) {
  if (event.type === 'pointerover' && (event.pointerType === 'touch' || event.buttons)) return
  const target = event.target?.closest?.(selector)
  if (!target || target.closest('[inert]')) return hide()
  if (target.getAttribute('aria-expanded') === 'true' && !target.matches('.nav-group-toggle')) return hide()
  // Visible sidebar labels and segmented choices already explain themselves.
  // Keep immediate hints for icon-only controls, not form/editor surfaces.
  if (target.closest('.sidebar:not(.is-compact)') && !target.closest('.mobile-bar')) return hide()
  if (target.closest('.el-segmented, [contenteditable="true"]') || target.matches('input, textarea, iframe')) return hide()
  if (event.type === 'focusin' && !target.matches(':focus-visible')) return
  if (target === anchor) return
  // Existing explanatory Element Plus tooltips keep their own content.
  const existing = (target.getAttribute('aria-describedby') || '').split(/\s+/)
    .some(id => id !== 'mail-instant-tooltip' && document.getElementById(id)?.getAttribute('role') === 'tooltip')
  if (existing) return hide()
  const title = target.getAttribute('title')
  if (title) {
    target.dataset.tooltip = title
    target.removeAttribute('title')
  }
  const text = target.dataset.tooltip || target.dataset.railLabel || target.getAttribute('aria-label') || target.textContent.trim()
  if (!text) return hide()
  hide()
  anchor = target
  const current = generation
  hint.value = text
  target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby'), 'mail-instant-tooltip'].filter(Boolean).join(' '))
  await nextTick()
  if (current !== generation || !panel.value) return
  const box = target.getBoundingClientRect()
  const tip = panel.value.getBoundingClientRect()
  const rail = target.closest('.sidebar.is-compact')
  const compact = !!rail
  let x = compact ? rail.getBoundingClientRect().right + 12 : box.left + (box.width - tip.width) / 2
  let y = compact ? box.top + (box.height - tip.height) / 2 : box.bottom + 7
  if (y + tip.height > window.innerHeight - 8) y = box.top - tip.height - 7
  position.x = Math.max(8, Math.min(x, window.innerWidth - tip.width - 8))
  position.y = Math.max(8, Math.min(y, window.innerHeight - tip.height - 8))
  position.rail = compact
  position.arrow = Math.max(8, Math.min(box.top + box.height / 2 - position.y, tip.height - 8))
  position.ready = true
}

function leave(event) {
  if (anchor && !anchor.contains(event.relatedTarget)) hide()
}
function keydown(event) { if (event.key === 'Escape') hide() }
const listeners = [['pointerover', show], ['focusin', show], ['pointerout', leave], ['focusout', leave], ['pointerdown', hide], ['scroll', hide], ['keydown', keydown]]
onMounted(() => {
  listeners.forEach(([type, handler]) => document.addEventListener(type, handler, true))
  window.addEventListener('resize', hide)
})
onBeforeUnmount(() => {
  hide()
  listeners.forEach(([type, handler]) => document.removeEventListener(type, handler, true))
  window.removeEventListener('resize', hide)
})
watch(() => route.fullPath, hide)
</script>

<style>
.mail-instant-tooltip {
  position: fixed;
  z-index: 10000;
  max-width: min(260px, calc(100vw - 16px));
  padding: 5px 9px;
  border: 1px solid var(--mac-line);
  border-radius: 8px;
  background: var(--glass-bg-solid);
  color: var(--mac-text);
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  font-size: var(--mac-fs-caption);
  font-weight: 500;
  line-height: 1.5;
  overflow-wrap: anywhere;
  pointer-events: none;
}
.mail-instant-tooltip.is-rail-bubble::before {
  position: absolute;
  left: -5px;
  top: calc(var(--tip-arrow-y) - 5px);
  width: 8px;
  height: 8px;
  border-left: 1px solid var(--mac-line);
  border-bottom: 1px solid var(--mac-line);
  background: var(--glass-bg-solid);
  transform: rotate(45deg);
  content: '';
}
</style>

import { onBeforeUnmount, onMounted, ref } from 'vue'

const holdTime = 380
const movementLimit = 7
const selector = '[data-nav-sort][data-nav-key]'

export function useNavigationOrder(uiStore, userId) {
  const dragging = ref(null)
  const dropTarget = ref(null)
  let press
  let timer
  let skipClick = false
  let clickTimer

  function ordered(items, group, keyOf) {
    const saved = uiStore.navigationOrder?.[userId.value]?.[group]
    if (!Array.isArray(saved)) return items
    const ranks = new Map(saved.map((key, index) => [key, index]))
    return [...items].sort((a, b) =>
      (ranks.get(keyOf(a)) ?? saved.length) - (ranks.get(keyOf(b)) ?? saved.length))
  }

  function moveItem(container, source, destination, after) {
    const group = source.dataset.navSort
    const keys = [...container.querySelectorAll(selector)]
      .filter(element => element.dataset.navSort === group)
      .map(element => element.dataset.navKey)
    const next = keys.filter(key => key !== source.dataset.navKey)
    const index = next.indexOf(destination.dataset.navKey)
    if (index < 0 || !userId.value) return
    next.splice(index + Number(after), 0, source.dataset.navKey)
    const saved = uiStore.navigationOrder[userId.value] ?? {}
    const hidden = (Array.isArray(saved[group]) ? saved[group] : []).filter(key => !keys.includes(key))
    uiStore.navigationOrder[userId.value] = { ...saved, [group]: [...next, ...hidden] }
  }

  function begin(event) {
    if (!event.isPrimary || event.button !== 0 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    const element = event.target.closest(selector)
    if (!element) return
    press = { element, container: event.currentTarget, id: event.pointerId, x: event.clientX, y: event.clientY }
    timer = window.setTimeout(() => {
      if (press) dragging.value = element.dataset.navKey
    }, holdTime)
  }

  function update(event) {
    if (!press || press.id !== event.pointerId) return
    if (!dragging.value) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > movementLimit) reset()
      return
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(selector)
    if (!target || target === press.element || !press.container.contains(target) ||
      target.dataset.navSort !== press.element.dataset.navSort) {
      dropTarget.value = null
      return
    }
    const rect = target.getBoundingClientRect()
    dropTarget.value = { element: target, key: target.dataset.navKey, after: event.clientY > rect.top + rect.height / 2 }
  }

  function finish(event) {
    if (!press || press.id !== event.pointerId) return
    if (dragging.value) {
      skipClick = true
      window.clearTimeout(clickTimer)
      clickTimer = window.setTimeout(() => { skipClick = false }, 0)
      if (event.type === 'pointerup' && dropTarget.value) {
        moveItem(press.container, press.element, dropTarget.value.element, dropTarget.value.after)
      }
    }
    reset()
  }

  function reset() {
    window.clearTimeout(timer)
    press = null
    dragging.value = null
    dropTarget.value = null
  }

  function blockDragClick(event) {
    if (skipClick || dragging.value) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function keyboardMove(event) {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
    const source = event.target.closest(selector)
    if (!source) return
    const peers = [...event.currentTarget.querySelectorAll(selector)]
      .filter(element => element.dataset.navSort === source.dataset.navSort)
    const down = event.key === 'ArrowDown'
    const target = peers[peers.indexOf(source) + (down ? 1 : -1)]
    if (!target) return
    event.preventDefault()
    moveItem(event.currentTarget, source, target, down)
    requestAnimationFrame(() => source.focus())
  }

  function itemClass(key) {
    return {
      'nav-sort-held': dragging.value === key,
      'nav-sort-before': dropTarget.value?.key === key && !dropTarget.value.after,
      'nav-sort-after': dropTarget.value?.key === key && dropTarget.value.after,
    }
  }

  onMounted(() => {
    window.addEventListener('pointermove', update)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    window.addEventListener('blur', reset)
  })
  onBeforeUnmount(() => {
    reset()
    window.clearTimeout(clickTimer)
    window.removeEventListener('pointermove', update)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    window.removeEventListener('blur', reset)
  })

  return { ordered, begin, blockDragClick, keyboardMove, itemClass, dragging }
}

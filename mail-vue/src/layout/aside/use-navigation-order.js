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
  let scrollFrame

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
    if (event.pointerType === 'touch') return
    if (!event.isPrimary || event.button !== 0 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    startPress(event, event.pointerId, false)
  }

  function beginTouch(event) {
    if (event.touches.length !== 1) return reset()
    startPress({ ...event.touches[0], target: event.target, currentTarget: event.currentTarget,
      clientX: event.touches[0].clientX, clientY: event.touches[0].clientY }, event.touches[0].identifier, true)
  }

  function startPress(event, id, touch) {
    reset()
    const element = event.target.closest(selector)
    if (!element) return
    press = { element, container: event.currentTarget, id, touch, x: event.clientX, y: event.clientY }
    timer = window.setTimeout(() => {
      if (!press) return
      dragging.value = element.dataset.navKey
      if (!touch) element.setPointerCapture?.(id)
      scrollFrame = requestAnimationFrame(autoScroll)
    }, holdTime)
  }

  function autoScroll() {
    if (!press || !dragging.value) return
    const scroller = press.container.closest('.el-scrollbar__wrap')
    if (scroller) {
      const bounds = scroller.getBoundingClientRect()
      const y = press.lastY ?? press.y
      const speed = y < bounds.top + 32 ? -8 : y > bounds.bottom - 32 ? 8 : 0
      if (speed) {
        scroller.scrollTop += speed
        updateTarget(press.lastX ?? press.x, y)
      }
    }
    scrollFrame = requestAnimationFrame(autoScroll)
  }

  function update(event) {
    if (!press || press.touch || press.id !== event.pointerId) return
    updatePosition(event.clientX, event.clientY)
  }

  function updateTouch(event) {
    if (!press?.touch) return
    const touch = [...event.touches].find(item => item.identifier === press.id)
    if (!touch) return reset()
    if (dragging.value && event.cancelable) event.preventDefault()
    updatePosition(touch.clientX, touch.clientY)
  }

  function updatePosition(x, y) {
    press.lastX = x
    press.lastY = y
    if (!dragging.value) {
      if (Math.hypot(x - press.x, y - press.y) > movementLimit) reset()
      return
    }
    updateTarget(x, y)
  }

  function updateTarget(x, y) {
    const target = document.elementFromPoint(x, y)?.closest(selector)
    if (!target || target === press.element || !press.container.contains(target) ||
      target.dataset.navSort !== press.element.dataset.navSort) {
      dropTarget.value = null
      return
    }
    const rect = target.getBoundingClientRect()
    dropTarget.value = { element: target, key: target.dataset.navKey, after: y > rect.top + rect.height / 2 }
  }

  function finish(event) {
    if (!press || press.touch || press.id !== event.pointerId) return
    complete(event.type === 'pointerup')
  }

  function finishTouch(event) {
    if (!press?.touch || ![...event.changedTouches].some(touch => touch.identifier === press.id)) return
    complete(event.type === 'touchend')
  }

  function complete(commit) {
    if (dragging.value) {
      skipClick = true
      window.clearTimeout(clickTimer)
      clickTimer = window.setTimeout(() => { skipClick = false }, 450)
      if (commit && dropTarget.value) {
        moveItem(press.container, press.element, dropTarget.value.element, dropTarget.value.after)
      }
    }
    reset()
  }

  function reset() {
    window.clearTimeout(timer)
    cancelAnimationFrame(scrollFrame)
    if (press && !press.touch && press.element.hasPointerCapture?.(press.id)) press.element.releasePointerCapture(press.id)
    press = null
    dragging.value = null
    dropTarget.value = null
  }

  function blockDragClick(event) {
    if (skipClick || dragging.value) {
      event.preventDefault()
      event.stopPropagation()
      skipClick = false
    }
  }

  function preventHoldMenu(event) { if (press?.touch || dragging.value) event.preventDefault() }

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
    window.addEventListener('touchmove', updateTouch, { passive: false })
    window.addEventListener('touchend', finishTouch)
    window.addEventListener('touchcancel', finishTouch)
    window.addEventListener('blur', reset)
  })
  onBeforeUnmount(() => {
    reset()
    window.clearTimeout(clickTimer)
    window.removeEventListener('pointermove', update)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', finish)
    window.removeEventListener('touchmove', updateTouch)
    window.removeEventListener('touchend', finishTouch)
    window.removeEventListener('touchcancel', finishTouch)
    window.removeEventListener('blur', reset)
  })

  return { ordered, begin, beginTouch, preventHoldMenu, blockDragClick, keyboardMove, itemClass, dragging }
}

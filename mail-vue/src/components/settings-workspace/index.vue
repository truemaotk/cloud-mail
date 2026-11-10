<template>
  <div class="settings-workspace">
    <nav class="settings-index" :aria-label="$t('settingsSections')">
      <p>{{ $t('settingsSections') }}</p>
      <RouterLink
        v-for="item in sections"
        :key="item.key"
        :to="{ path: route.path, query: { ...route.query, section: item.key } }"
        custom
        v-slot="{ href, navigate }"
      >
        <a :href="href" class="section-link" :aria-current="item.key === active.key ? 'page' : undefined" @click="navigate">
          <NavigationIcon :name="item.icon" />
          <span>{{ $t(item.label) }}</span>
        </a>
      </RouterLink>
    </nav>
    <div ref="scrollArea" class="settings-surface">
      <header :key="active.key" class="section-heading">
        <h2>{{ $t(active.label) }}</h2>
        <p v-if="active.description">{{ $t(active.description) }}</p>
      </header>
      <div class="section-body">
        <slot :section="active.key" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavigationIcon from '@/components/navigation-icon/index.vue'

const props = defineProps({ sections: { type: Array, required: true } })
const route = useRoute()
const scrollArea = ref(null)
const active = computed(() => props.sections.find(item => item.key === route.query.section) ?? props.sections[0])

watch(() => active.value.key, () => scrollArea.value?.scrollTo(0, 0), { flush: 'post' })
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .section-heading,
  .section-body :deep(> section) { animation: mail-content-in 180ms ease-out; }
}

.settings-workspace {
  display: grid;
  grid-template-columns: 192px minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding-block: var(--mail-shell-gutter);
  background: var(--mail-shell-rail);
}

.settings-index {
  align-self: start;
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-card);
  background: var(--el-bg-color);
}

.settings-index > p {
  padding: 7px 8px 5px;
  color: var(--mail-shell-muted);
  font-size: 12px;
  font-weight: 600;
}

.section-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 7px 9px;
  border-radius: var(--mail-radius-control);
  color: var(--mail-shell-muted);
  font-size: 13px;
  text-decoration: none;
}

.section-link svg {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
}

.section-link:hover,
.section-link[aria-current='page'] {
  color: var(--el-text-color-primary);
  background: var(--mail-shell-hover);
}

.section-link[aria-current='page']::before {
  position: absolute;
  inset: 8px auto 8px 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--mail-shell-marker);
  content: '';
}

.section-link:focus-visible {
  outline: 2px solid var(--mail-shell-muted);
  outline-offset: -2px;
}

.settings-surface {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-card);
  background: var(--el-bg-color);
}

.section-heading,
.section-body {
  padding: 20px clamp(16px, 2.4vw, 32px);
}

.section-body {
  display: grid;
  gap: 16px;
}

.section-heading {
  border-bottom: 1px solid var(--mail-shell-line);
}

.section-heading h2 {
  font-size: 23px;
  line-height: 1.25;
  font-weight: 650;
}

.section-heading p {
  margin-top: 5px;
  color: var(--mail-shell-muted);
  font-size: 13px;
}

@media (max-width: 720px) {
  .settings-workspace {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
  }

  .settings-index {
    display: flex;
    flex-wrap: wrap;
  }

  .settings-index > p {
    display: none;
  }

  .section-link {
    flex-shrink: 0;
  }

  .section-heading,
  .section-body {
    padding: 16px;
  }
}
</style>

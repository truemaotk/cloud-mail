<template>
  <el-scrollbar class="analysis-scroll">
    <section class="analysis" aria-labelledby="analysis-heading">
      <header class="analysis-heading">
        <div>
          <h2 id="analysis-heading">{{ t('analysisOverview') }}</h2>
          <p>{{ t('analysisDescription') }}</p>
        </div>
        <div class="analysis-actions">
          <span v-if="lastRead">{{ t('analysisLastRead', { time: lastRead }) }}</span>
          <el-button :loading="loading" @click="loadAnalysis">
            <template #icon><NavigationIcon name="refresh" :size="15" /></template>
            {{ t('refreshMail') }}
          </el-button>
        </div>
      </header>

      <div v-if="!data" :class="{ 'analysis-state': !loading }" :aria-busy="loading">
        <el-skeleton v-if="loading" animated>
          <template #template>
            <div class="analysis-metrics">
              <el-skeleton-item v-for="card in 5" :key="card" variant="rect" class="analysis-placeholder" />
            </div>
            <div class="analysis-charts">
              <el-skeleton-item v-for="card in 2" :key="card" variant="rect" class="analysis-placeholder is-chart" />
            </div>
          </template>
        </el-skeleton>
        <p v-else role="alert">{{ t('analysisLoadFailed') }}</p>
      </div>

      <template v-else>
        <div class="analysis-metrics">
          <article v-for="metric in metrics" :key="metric.label" class="analysis-metric">
            <div class="metric-heading">
              <h3>{{ t(metric.label) }}</h3>
              <span class="metric-icon"><NavigationIcon :name="metric.icon" :size="18" /></span>
            </div>
            <strong class="metric-value">{{ formatNumber(metric.total) }}</strong>
            <dl v-if="metric.active !== undefined" class="metric-breakdown">
              <div><dt>{{ t('active') }}</dt><dd>{{ formatNumber(metric.active) }}</dd></div>
              <div><dt>{{ t('deleted') }}</dt><dd>{{ formatNumber(metric.deleted) }}</dd></div>
            </dl>
            <p v-else class="metric-caption">{{ t('analysisTodayNote') }}</p>
          </article>
        </div>

        <div class="analysis-charts">
          <section class="analysis-card">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('emailGrowth') }}</h3>
                <p>{{ t('analysisMailTrendNote') }}</p>
              </div>
              <span class="analysis-range">{{ t('analysisDays', { count: mailDays.length }) }}</span>
            </header>
            <div class="analysis-plot-frame">
              <div ref="mailPlot" class="analysis-plot" role="img" :aria-label="mailChartLabel"></div>
              <p v-if="!receivedInRange && !sentInRange" class="analysis-plot-empty">{{ t('analysisNoMailTrend') }}</p>
            </div>
          </section>

          <section class="analysis-card">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('emailSource') }}</h3>
                <p>{{ t('analysisSourcesNote') }}</p>
              </div>
            </header>
            <ol v-if="sources.length" class="analysis-sources">
              <li v-for="(source, index) in sources" :key="source.name">
                <span class="source-position">{{ index + 1 }}</span>
                <div class="source-detail">
                  <span class="source-name" :title="source.name">{{ source.name }}</span>
                  <span class="source-track" aria-hidden="true">
                    <span :style="{ width: (100 * source.total / sources[0].total) + '%' }"></span>
                  </span>
                </div>
                <strong>{{ formatNumber(source.total) }}</strong>
              </li>
            </ol>
            <div v-else class="analysis-source-empty">
              <span class="metric-icon"><NavigationIcon name="inbox" /></span>
              <p>{{ t('analysisNoSources') }}</p>
            </div>
          </section>

          <section class="analysis-card analysis-users">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('userGrowth') }}</h3>
                <p>{{ t('analysisUserTrendNote') }}</p>
              </div>
              <span class="analysis-range">{{ t('analysisDays', { count: userDays.length }) }}</span>
            </header>
            <div class="analysis-plot-frame">
              <div ref="userPlot" class="analysis-plot" role="img" :aria-label="userChartLabel"></div>
              <p v-if="!usersInRange" class="analysis-plot-empty">{{ t('analysisNoUserTrend') }}</p>
            </div>
          </section>
        </div>
      </template>
    </section>
  </el-scrollbar>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import NavigationIcon from '@/components/navigation-icon/index.vue'
import echarts from '@/echarts/index.js'
import { analysisEcharts } from '@/request/analysis.js'
import { useUiStore } from '@/store/ui.js'

defineOptions({ name: 'analysis' })

const { t, locale } = useI18n()
const uiStore = useUiStore()
const data = shallowRef(null)
const loading = ref(true)
const requestedAt = ref(null)
const mailPlot = ref(null)
const userPlot = ref(null)

const metrics = computed(() => {
  const counts = data.value.numberCount
  return [
    { label: 'totalReceived', icon: 'inbox', total: counts.receiveTotal, active: counts.normalReceiveTotal, deleted: counts.delReceiveTotal },
    { label: 'totalSent', icon: 'send', total: counts.sendTotal, active: counts.normalSendTotal, deleted: counts.delSendTotal },
    { label: 'totalMailboxes', icon: 'mailbox', total: counts.accountTotal, active: counts.normalAccountTotal, deleted: counts.delAccountTotal },
    { label: 'totalUsers', icon: 'user', total: counts.userTotal, active: counts.normalUserTotal, deleted: counts.delUserTotal },
    { label: 'sentToday', icon: 'mail-delivered', total: data.value.daySendTotal },
  ]
})
const sources = computed(() => data.value?.receiveRatio.nameRatio.filter(row => row.total > 0) ?? [])
const mailDays = computed(() => data.value?.emailDayCount.receiveDayCount ?? [])
const sentDays = computed(() => data.value?.emailDayCount.sendDayCount ?? [])
const userDays = computed(() => data.value?.userDayCount ?? [])
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const lastRead = computed(() => requestedAt.value?.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' }))
const formatNumber = value => numberFormatter.value.format(Number(value) || 0)
const sum = rows => rows.reduce((total, row) => total + Number(row.total), 0)
const receivedInRange = computed(() => sum(mailDays.value))
const sentInRange = computed(() => sum(sentDays.value))
const usersInRange = computed(() => sum(userDays.value))
const mailChartLabel = computed(() => t('analysisMailSummary', {
  days: mailDays.value.length, received: formatNumber(receivedInRange.value), sent: formatNumber(sentInRange.value),
}))
const userChartLabel = computed(() => t('analysisUserSummary', {
  days: userDays.value.length, total: formatNumber(usersInRange.value),
}))

let pending = false

async function loadAnalysis() {
  if (pending) return
  pending = true
  loading.value = true
  try {
    data.value = await analysisEcharts(Intl.DateTimeFormat().resolvedOptions().timeZone)
    requestedAt.value = new Date()
  } catch {
    // Keep the current data visible if refreshing fails.
  } finally {
    loading.value = false
    pending = false
  }
}

const resizeObserver = new ResizeObserver(entries => {
  for (const { target, contentRect } of entries) {
    if (contentRect.width > 0) echarts.getInstanceByDom(target)?.resize()
  }
})

function updateChart(element, options) {
  let chart = echarts.getInstanceByDom(element)
  if (!chart) {
    chart = echarts.init(element)
    resizeObserver.observe(element)
  }
  chart.setOption(options, { notMerge: true })
}

watchEffect(() => {
  if (!data.value || !mailPlot.value || !userPlot.value) return

  const dark = uiStore.dark
  const palette = dark
    ? { ink: '#e7e7e7', muted: '#b2b2b2', line: '#3a3a3a', received: '#b2c3e0', sent: '#77b7a8', background: '#242424' }
    : { ink: '#262626', muted: '#626262', line: '#ededed', received: '#354865', sent: '#548f81', background: '#fff' }
  const dateFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dates = rows => rows.map(({ date }) => dateFormatter.format(new Date(date + 'T00:00:00Z')))
  const chartOptions = (rows, top) => ({
    animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    animationDuration: 240,
    grid: { top, left: 14, right: 16, bottom: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.background,
      borderColor: palette.line,
      textStyle: { color: palette.ink },
    },
    xAxis: {
      type: 'category',
      data: dates(rows),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: palette.line } },
      axisLabel: { color: palette.muted, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      splitNumber: 4,
      axisLabel: { color: palette.muted },
      splitLine: { lineStyle: { color: palette.line } },
    },
  })
  const sentByDate = new Map(sentDays.value.map(({ date, total }) => [date, total]))
  const bars = (name, color, values) => ({
    name,
    type: 'bar',
    barMaxWidth: 14,
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    data: values,
  })

  updateChart(mailPlot.value, {
    ...chartOptions(mailDays.value, 36),
    legend: { top: 0, left: 9, icon: 'roundRect', textStyle: { color: palette.muted } },
    series: [
      bars(t('received'), palette.received, mailDays.value.map(row => row.total)),
      bars(t('sent'), palette.sent, mailDays.value.map(row => sentByDate.get(row.date) ?? 0)),
    ],
  })
  updateChart(userPlot.value, {
    ...chartOptions(userDays.value, 15),
    series: [{
      name: t('analysisNewUsers'),
      type: 'line',
      symbol: 'circle',
      symbolSize: 5,
      itemStyle: { color: palette.received },
      lineStyle: { width: 2 },
      areaStyle: { opacity: .10 },
      data: userDays.value.map(row => row.total),
    }],
  })
}, { flush: 'post' })

onMounted(loadAnalysis)
onBeforeUnmount(() => {
  resizeObserver.disconnect()
  for (const element of [mailPlot.value, userPlot.value]) {
    if (element) echarts.getInstanceByDom(element)?.dispose()
  }
})
</script>

<style scoped>
.analysis-scroll {
  height: 100%;
  min-width: 0;
  margin-inline-end: calc(-1 * var(--mail-shell-gutter));
  background: var(--el-bg-color);
}

.analysis-scroll :deep(.el-scrollbar__wrap) {
  padding-inline-end: var(--mail-shell-gutter);
}

.analysis {
  container-type: inline-size;
  display: grid;
  gap: 16px;
  padding-block: var(--mail-shell-gutter);
}

.analysis-placeholder { height: 112px; border-radius: var(--mail-radius-card); }
.analysis-placeholder.is-chart { height: 244px; margin-top: 14px; }

@media (prefers-reduced-motion: no-preference) {
  .analysis-metric, .analysis-card { animation: mail-content-in 180ms ease-out; }
}

.analysis-heading,
.analysis-actions,
.metric-heading,
.analysis-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analysis-heading {
  flex-wrap: wrap;
  padding-block: 1px 3px;
}

.analysis-heading h2 {
  font-size: 24px;
  font-weight: 680;
  letter-spacing: -.02em;
}

.analysis-heading p,
.analysis-card-heading p,
.analysis-actions > span,
.metric-caption {
  color: var(--mail-shell-muted);
  font-size: 12px;
}

.analysis-heading p {
  margin-top: 2px;
  font-size: 13px;
}

.analysis-actions .el-button :deep(.el-icon) {
  height: 16px;
}

.analysis-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.analysis-metric,
.analysis-card,
.analysis-state {
  min-width: 0;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-card);
  background: var(--el-bg-color);
}

.analysis-metric {
  display: grid;
  align-content: start;
  padding: 13px 14px 12px;
}

.metric-heading h3 {
  font-size: 13px;
  font-weight: 620;
}

.metric-icon {
  display: inline-grid;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-control);
  background: var(--mail-shell-rail);
  color: var(--mail-shell-muted);
}

.metric-value {
  display: block;
  font-size: 29px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}

.metric-breakdown,
.metric-caption {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--mail-shell-line);
}

.metric-breakdown,
.metric-breakdown > div {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
}

.metric-breakdown > div { gap: 5px; }
.metric-breakdown dt { color: var(--mail-shell-muted); }
.metric-breakdown dd { font-variant-numeric: tabular-nums; font-weight: 600; }

.analysis-charts {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 14px;
}

.analysis-card { padding: 15px 15px 8px; }
.analysis-card-heading { align-items: start; padding: 0 2px 12px; }
.analysis-card-heading h3 { font-size: 15px; font-weight: 650; }
.analysis-card-heading p { margin-top: 3px; }

.analysis-range {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid var(--mail-shell-line);
  border-radius: 6px;
  color: var(--mail-shell-muted);
  font-size: 11px;
}

.analysis-plot-frame { position: relative; }
.analysis-plot { width: 100%; height: 226px; }
.analysis-plot-empty {
  position: absolute;
  inset: 52% 16px auto;
  color: var(--mail-shell-muted);
  font-size: 12px;
  pointer-events: none;
  text-align: center;
}
.analysis-users { grid-column: 1 / -1; }
.analysis-users .analysis-plot { height: 185px; }

.analysis-sources {
  display: grid;
  gap: 4px;
  padding: 0 2px 8px;
}

.analysis-sources li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding-block: 7px;
  border-top: 1px solid var(--mail-shell-line);
  font-size: 13px;
}

.source-position {
  display: grid;
  height: 23px;
  place-items: center;
  border-radius: 6px;
  background: var(--mail-shell-rail);
  color: var(--mail-shell-muted);
  font-size: 11px;
}

.source-detail { display: grid; min-width: 0; gap: 5px; }
.source-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-track { height: 3px; overflow: hidden; border-radius: 3px; background: var(--mail-shell-hover); }
.source-track > span { display: block; height: 100%; border-radius: inherit; background: var(--mail-shell-marker); }
.analysis-sources strong { font-size: 12px; font-variant-numeric: tabular-nums; }

.analysis-source-empty,
.analysis-state {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 8px;
  min-height: 200px;
  color: var(--mail-shell-muted);
  text-align: center;
}

@container (max-width: 960px) {
  .analysis-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@container (max-width: 660px) {
  .analysis-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analysis-charts { grid-template-columns: minmax(0, 1fr); }
  .analysis-plot { height: 220px; }
}
</style>


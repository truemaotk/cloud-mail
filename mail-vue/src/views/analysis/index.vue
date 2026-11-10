<template>
  <div class="analysis-scroll">
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

      <div v-if="!data" class="analysis-loading" :class="{ 'analysis-state': !loading }" :aria-busy="loading">
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
          <section class="analysis-card analysis-mail">
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

          <section class="analysis-card analysis-sources-card">
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
  </div>
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

// Short plots get fewer gridlines so the y-axis labels never collide.
const splitFor = height => (height < 150 ? 2 : height < 230 ? 3 : 4)

const resizeObserver = new ResizeObserver(entries => {
  for (const { target, contentRect } of entries) {
    const chart = echarts.getInstanceByDom(target)
    if (!chart || contentRect.width <= 0) continue
    chart.setOption({ yAxis: { splitNumber: splitFor(contentRect.height) } })
    chart.resize()
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
    ? { ink: '#F5F5F7', muted: '#B4B4B8', line: '#343436', received: '#F2F2F4', sent: '#6E6E73', background: '#1E1E1F' }
    : { ink: '#1D1D1F', muted: '#5E5E62', line: '#E3E3E3', received: '#1D1D1F', sent: '#A1A1A6', background: '#FFFFFF' }
  const dateFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dates = rows => rows.map(({ date }) => dateFormatter.format(new Date(date + 'T00:00:00Z')))
  const chartOptions = (rows, top, element) => ({
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
      splitNumber: splitFor(element.clientHeight),
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
    ...chartOptions(mailDays.value, 30, mailPlot.value),
    legend: { top: 0, right: 12, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { color: palette.muted, fontSize: 11 } },
    series: [
      bars(t('received'), palette.received, mailDays.value.map(row => row.total)),
      bars(t('sent'), palette.sent, mailDays.value.map(row => sentByDate.get(row.date) ?? 0)),
    ],
  })
  updateChart(userPlot.value, {
    ...chartOptions(userDays.value, 12, userPlot.value),
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
  overflow: hidden;
}

/* One-screen dashboard: heading and metrics take their natural height,
   the chart grid absorbs whatever is left so nothing scrolls. */
.analysis {
  container-type: inline-size;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--mail-shell-gutter);
  height: 100%;
  padding-block: 12px 0;
}

.analysis-loading { grid-row: 2 / -1; min-height: 0; overflow: hidden; }

.analysis-placeholder { height: 112px; border-radius: var(--mail-radius-card); }
.analysis-placeholder.is-chart { height: 244px; }
.analysis-loading .analysis-charts { grid-template-rows: none; grid-template-areas: none; margin-top: var(--mail-shell-gutter); }

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
  font-size: var(--mac-fs-title);
  line-height: var(--mac-lh-title);
  font-weight: 600;
  letter-spacing: -.01em;
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
  gap: var(--mail-shell-gutter);
}

.analysis-metric,
.analysis-card,
.analysis-state {
  min-width: 0;
  border: 1px solid var(--mac-line);
  border-radius: var(--mail-radius-surface);
  background: var(--mac-surface);
}

.analysis-metric {
  display: grid;
  align-content: start;
  padding: 12px 14px 11px;
}

.metric-heading h3 {
  font-size: 13px;
  font-weight: 620;
}

.metric-icon {
  display: inline-grid;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--mail-shell-line);
  border-radius: var(--mail-radius-control);
  background: var(--mail-shell-rail);
  color: var(--mail-shell-muted);
}

.metric-value {
  display: block;
  margin-top: 2px;
  font-size: 26px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.metric-breakdown,
.metric-caption {
  margin-top: 8px;
  padding-top: 7px;
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
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: "mail sources" "users sources";
  gap: var(--mail-shell-gutter);
  min-height: 0;
}

.analysis-mail { grid-area: mail; }
.analysis-users { grid-area: users; }
.analysis-sources-card { grid-area: sources; }

.analysis-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 15px 6px;
}
.analysis-card-heading { flex-shrink: 0; align-items: start; padding: 0 2px 8px; }
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

.analysis-plot-frame { position: relative; flex: 1; min-height: 96px; }
.analysis-plot { position: absolute; inset: 0; }
.analysis-plot-empty {
  position: absolute;
  inset: 38% 16px auto;
  color: var(--mail-shell-muted);
  font-size: 12px;
  pointer-events: none;
  text-align: center;
}

.analysis-sources {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 2px;
  min-height: 0;
  overflow: hidden;
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
  flex: 1;
  min-height: 160px;
  color: var(--mail-shell-muted);
  text-align: center;
}

/* Short windows: drop the secondary descriptions so the charts keep room. */
@media (max-height: 760px) {
  .analysis-heading p,
  .analysis-card-heading p { display: none; }
  .analysis-card-heading { align-items: center; }
}

@container (max-width: 960px) {
  .analysis-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

/* Too small for a single screen (phones, very short windows): fall back to
   natural height and let the page scroll without a visible bar. */
@media (max-width: 1024px), (max-height: 560px) {
  .analysis-scroll { overflow-y: auto; scrollbar-width: none; }
  .analysis-scroll::-webkit-scrollbar { display: none; }
  .analysis { height: auto; grid-template-rows: none; padding-block-end: var(--mail-shell-gutter); }
  .analysis-charts { grid-template-rows: 280px 240px; }
  .analysis-plot-frame { min-height: 0; }
}

@media (max-width: 760px) {
  .analysis-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analysis-charts {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 260px auto 220px;
    grid-template-areas: "mail" "sources" "users";
  }
}
</style>


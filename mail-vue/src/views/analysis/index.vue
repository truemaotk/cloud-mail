<template>
  <div class="analysis-scroll">
    <section class="analysis" aria-labelledby="analysis-heading">
      <header class="analysis-heading">
        <div>
          <h2 id="analysis-heading">{{ t('analysisOverview') }}</h2>
          <p>{{ t('analysisDescription') }}</p>
        </div>
        <div class="analysis-toolbar">
          <form class="analysis-date-filter" :aria-label="t('analysisDateFilter')" @submit.prevent="applyDates">
            <el-date-picker v-model="startDate" type="date" :editable="false" size="small"
                            value-format="YYYY-MM-DD" popper-class="mail-search-date-popper"
                            :placeholder="t('searchStartDate')" :aria-label="t('searchStartDate')" @change="onStartDateChange" />
            <el-date-picker v-model="endDate" type="date" :editable="false" size="small"
                            value-format="YYYY-MM-DD" popper-class="mail-search-date-popper"
                            :placeholder="t('searchEndDate')" :aria-label="t('searchEndDate')" :disabled-date="disableEndDate" />
            <el-button native-type="submit" size="small" :disabled="loading || !validDateRange">{{ t('analysisApplyDates') }}</el-button>
          </form>
          <div class="analysis-actions">
            <el-button v-if="activeRange" size="small" :disabled="loading" @click="clearDates">{{ t('reset') }}</el-button>
            <span v-if="lastRead">{{ t('analysisLastRead', { time: lastRead }) }}</span>
            <el-button :disabled="loading" :aria-busy="loading || undefined" @click="loadAnalysis">
              <template #icon><NavigationIcon name="refresh" :size="16" :class="{ 'mail-spinner': loading }" /></template>
              {{ t('refreshMail') }}
            </el-button>
          </div>
        </div>
      </header>

      <div v-if="!data" class="analysis-loading" :class="{ 'analysis-state': !loading }" :aria-busy="loading">
        <el-skeleton v-if="loading" animated>
          <template #template>
            <div class="analysis-metrics">
              <el-skeleton-item v-for="card in 4" :key="card" variant="rect" class="analysis-placeholder" />
            </div>
            <div class="analysis-charts">
              <el-skeleton-item v-for="card in 3" :key="card" variant="rect" class="analysis-placeholder is-chart" />
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
            <div class="metric-value">
              <strong>{{ formatNumber(metric.total) }}</strong>
              <span v-if="metric.label === 'sentToday'" class="metric-limit">{{ t('analysisQuotaTotal', { count: formatNumber(quotaLimit) }) }}</span>
            </div>
            <dl v-if="metric.active !== undefined" class="metric-breakdown">
              <div><dt>{{ t('active') }}</dt><dd>{{ formatNumber(metric.active) }}</dd></div>
              <div><dt>{{ t('deleted') }}</dt><dd>{{ formatNumber(metric.deleted) }}</dd></div>
            </dl>
            <p v-else class="metric-caption">{{ t('analysisTodayNote') }}</p>
          </article>
        </div>

        <div class="analysis-charts">
          <section class="analysis-card analysis-users">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('userGrowth') }}</h3>
                <p>{{ t('analysisUserTrendNote') }}</p>
              </div>
              <el-select :model-value="activeRange ? 'custom' : userPeriod" class="analysis-range" size="small" suffix-icon="MailChevronDown"
                         :aria-label="t('analysisUserRange')" :disabled="loading" @change="selectPeriod('user', $event)">
                <el-option v-if="activeRange" value="custom" :label="t('analysisPeriod.custom')" disabled />
                <el-option v-for="period in periods" :key="period" :value="period" :label="t(`analysisPeriod.${period}`)" />
              </el-select>
            </header>
            <div class="analysis-plot-frame">
              <div ref="userPlot" class="analysis-plot" role="img" :aria-label="userChartLabel"></div>
              <p v-if="!usersInRange" class="analysis-plot-empty">{{ t('analysisNoUserTrend') }}</p>
            </div>
          </section>

          <section class="analysis-card analysis-mail">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('emailGrowth') }}</h3>
                <p>{{ t('analysisMailTrendNote') }}</p>
              </div>
              <el-select :model-value="activeRange ? 'custom' : mailPeriod" class="analysis-range" size="small" suffix-icon="MailChevronDown"
                         :aria-label="t('analysisMailRange')" :disabled="loading" @change="selectPeriod('mail', $event)">
                <el-option v-if="activeRange" value="custom" :label="t('analysisPeriod.custom')" disabled />
                <el-option v-for="period in periods" :key="period" :value="period" :label="t(`analysisPeriod.${period}`)" />
              </el-select>
            </header>
            <div class="analysis-plot-frame">
              <div ref="mailPlot" class="analysis-plot" role="img" :aria-label="mailChartLabel"></div>
              <p v-if="!receivedInRange && !sentInRange" class="analysis-plot-empty">{{ t('analysisNoMailTrend') }}</p>
            </div>
          </section>

          <section class="analysis-card analysis-quota">
            <header class="analysis-card-heading">
              <div>
                <h3>{{ t('sentToday') }}</h3>
                <p>{{ t('analysisTodayNote') }}</p>
              </div>
            </header>
            <div class="analysis-plot-frame quota-frame" role="progressbar" :aria-label="t('dailySendLimit')"
                 :aria-valuemax="quotaLimit" :aria-valuenow="Math.min(quotaUsed, quotaLimit)"
                 :aria-valuetext="t('analysisQuotaUsage', { used: formatNumber(quotaUsed), limit: formatNumber(quotaLimit) })">
              <div ref="quotaPlot" class="analysis-plot" aria-hidden="true"></div>
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
import { getPalette } from '@/utils/palettes.js'

defineOptions({ name: 'analysis' })

const { t, locale } = useI18n()
const uiStore = useUiStore()
const data = shallowRef(null)
const loading = ref(true)
const requestedAt = ref(null)
const mailPlot = ref(null)
const userPlot = ref(null)
const quotaPlot = ref(null)
const periods = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth']
const mailPeriod = ref('thisWeek')
const userPeriod = ref('thisWeek')
const startDate = ref('')
const endDate = ref('')
const activeRange = ref(null)
const validDateRange = computed(() => Boolean(startDate.value && endDate.value && startDate.value <= endDate.value))

const metrics = computed(() => {
  const counts = data.value.numberCount
  return [
    { label: 'totalReceived', icon: 'inbox', total: counts.receiveTotal, active: counts.normalReceiveTotal, deleted: counts.delReceiveTotal },
    { label: 'totalSent', icon: 'send', total: counts.sendTotal, active: counts.normalSendTotal, deleted: counts.delSendTotal },
    { label: 'totalMailboxes', icon: 'list', total: counts.accountTotal, active: counts.normalAccountTotal, deleted: counts.delAccountTotal },
    { label: 'sentToday', icon: 'mail-delivered', total: quotaUsed.value },
  ]
})
const mailDays = computed(() => data.value?.emailDayCount.receiveDayCount ?? [])
const sentDays = computed(() => data.value?.emailDayCount.sendDayCount ?? [])
const userDays = computed(() => data.value?.userDayCount ?? [])
const quotaUsed = computed(() => data.value?.daySendTotal ?? 0)
const quotaLimit = computed(() => data.value?.dailySendLimit ?? 100)
const accent = computed(() => getPalette(uiStore.palette)[uiStore.dark ? 'dark' : 'light'])
const accentRgb = computed(() => accent.value.slice(1).match(/../g).map(hex => parseInt(hex, 16)).join(', '))
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
let loadedSelection = { mailPeriod: mailPeriod.value, userPeriod: userPeriod.value, range: null }

function disableEndDate(date) {
  return Boolean(startDate.value && date < new Date(`${startDate.value}T00:00:00`))
}

function onStartDateChange(date) {
  if (date && endDate.value && endDate.value < date) endDate.value = ''
}

function applyDates() {
  if (pending || !validDateRange.value) return
  activeRange.value = { startDate: startDate.value, endDate: endDate.value }
  loadAnalysis()
}

function resetDateFields() {
  activeRange.value = null
  startDate.value = ''
  endDate.value = ''
}

function clearDates() {
  resetDateFields()
  loadAnalysis()
}

function selectPeriod(chart, period) {
  if (chart === 'mail') mailPeriod.value = period
  else userPeriod.value = period
  resetDateFields()
  loadAnalysis()
}

async function loadAnalysis() {
  if (pending) return
  pending = true
  loading.value = true
  const started = Date.now()
  try {
    const selection = { mailPeriod: mailPeriod.value, userPeriod: userPeriod.value, range: activeRange.value }
    data.value = await analysisEcharts({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mailPeriod: selection.mailPeriod, userPeriod: selection.userPeriod, ...selection.range,
    })
    loadedSelection = selection
    requestedAt.value = new Date()
  } catch {
    // Keep the displayed data and filters in sync if the request fails.
    mailPeriod.value = loadedSelection.mailPeriod
    userPeriod.value = loadedSelection.userPeriod
    activeRange.value = loadedSelection.range
  } finally {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 600 - (Date.now() - started))))
    loading.value = false
    pending = false
  }
}

// Short plots get fewer gridlines so the y-axis labels never collide.
const splitFor = height => (height < 150 ? 2 : height < 230 ? 3 : 4)

const resizeObserver = new ResizeObserver(entries => {
  for (const { target, contentRect } of entries) {
    const chart = echarts.getInstanceByDom(target)
    if (!chart || contentRect.width <= 0 || contentRect.height <= 0) continue
    if (target === mailPlot.value || target === userPlot.value) {
      chart.setOption({ yAxis: { splitNumber: splitFor(contentRect.height) } })
    }
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
  if (!data.value || !mailPlot.value || !userPlot.value || !quotaPlot.value) return

  const dark = uiStore.dark
  const palette = dark
    ? { ink: '#F5F5F7', muted: '#B4B4B8', line: '#48484D', background: '#242426' }
    : { ink: '#1D1D1F', muted: '#5E5E62', line: '#D9D9DE', background: '#F6F6F8' }
  const animation = !uiStore.reduceMotion
  const tooltip = {
    confine: true,
    backgroundColor: palette.background,
    borderColor: palette.line,
    textStyle: { color: palette.ink },
  }
  const dateFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dates = rows => rows.map(({ date }) => dateFormatter.format(new Date(date + 'T00:00:00Z')))
  const chartOptions = (rows, top, element) => ({
    animation,
    animationDuration: 240,
    grid: { top, left: 14, right: 16, bottom: 12, containLabel: true },
    tooltip: { ...tooltip, trigger: 'axis' },
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
      bars(t('received'), accent.value, mailDays.value.map(row => row.total)),
      bars(t('sent'), `rgba(${accentRgb.value}, 0.52)`, mailDays.value.map(row => sentByDate.get(row.date) ?? 0)),
    ],
  })
  updateChart(userPlot.value, {
    ...chartOptions(userDays.value, 12, userPlot.value),
    series: [{
      name: t('analysisNewUsers'),
      type: 'line',
      symbol: 'circle',
      symbolSize: 5,
      itemStyle: { color: accent.value },
      lineStyle: { width: 2 },
      areaStyle: { opacity: .10 },
      data: userDays.value.map(row => row.total),
    }],
  })
  updateChart(quotaPlot.value, {
    animation,
    tooltip,
    color: [accent.value],
    series: [{
      name: t('sentToday'),
      type: 'gauge',
      max: quotaLimit.value,
      splitNumber: Math.min(10, quotaLimit.value),
      progress: { show: true, roundCap: true, clip: true, itemStyle: { color: accent.value } },
      pointer: { itemStyle: { color: accent.value } },
      axisLabel: { color: palette.muted, formatter: value => formatNumber(Math.round(value)) },
      axisLine: { roundCap: true, lineStyle: { color: [[1, `rgba(${accentRgb.value}, ${dark ? 0.23 : 0.14})`]] } },
      splitLine: { lineStyle: { color: palette.muted } },
      axisTick: { lineStyle: { color: palette.muted } },
      detail: { valueAnimation: animation, formatter: value => formatNumber(Math.round(value)), color: palette.ink },
      data: [{ value: quotaUsed.value, name: t('total'), title: { color: palette.ink } }],
    }],
  })
}, { flush: 'post' })

onMounted(loadAnalysis)
onBeforeUnmount(() => {
  resizeObserver.disconnect()
  for (const element of [mailPlot.value, userPlot.value, quotaPlot.value]) {
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

.analysis-metric, .analysis-card { animation: mail-content-in 180ms ease-out; }

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

.analysis-toolbar {
  display: grid;
  justify-items: end;
  gap: 6px;
  max-width: 100%;
  margin-inline-start: auto;
}

.analysis-date-filter {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 128px)) auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.analysis-date-filter :deep(.el-date-editor) { width: 100%; min-width: 0; }
.analysis-actions { justify-content: flex-end; gap: 8px; }

.analysis-actions .el-button :deep(.el-icon) {
  height: 16px;
}

.analysis-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  margin-top: 2px;
  font-size: 26px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.metric-value strong { font-weight: inherit; }

.metric-limit {
  color: var(--mail-shell-muted);
  font-size: 14px;
  font-weight: 500;
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
  grid-template-areas: "mail quota" "users quota";
  gap: var(--mail-shell-gutter);
  min-height: 0;
}

.analysis-mail { grid-area: mail; }
.analysis-users { grid-area: users; }
.analysis-quota { grid-area: quota; }

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
  width: 110px;
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

.quota-frame {
  width: min(100%, 350px);
  max-height: 350px;
  margin: auto;
}

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

@container (max-width: 680px) {
  .analysis-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
    grid-template-rows: 250px 225px 350px;
    grid-template-areas: "mail" "users" "quota";
  }
}
</style>


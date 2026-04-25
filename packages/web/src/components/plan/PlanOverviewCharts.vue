<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { NCard, NGrid, NGi, NSpin, NEmpty } from 'naive-ui'
import { getPlanProgress } from '@/services/planApi'
import type { PlanProgress } from '@/types/plan'
import type { PlanListItem } from '@/services/plan'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
])

const props = defineProps<{
  plans: PlanListItem[]
}>()

const loading = ref(false)
const progressMap = ref<Map<string, PlanProgress>>(new Map())

async function fetchAllProgress() {
  loading.value = true
  try {
    const activePlans = props.plans.filter(p => p.status === 'active' || p.status === 'completed')
    const results = await Promise.allSettled(
      activePlans.map(p => getPlanProgress(p.id))
    )
    const map = new Map<string, PlanProgress>()
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        map.set(activePlans[i].id, r.value)
      }
    })
    progressMap.value = map
  } finally {
    loading.value = false
  }
}

onMounted(fetchAllProgress)
watch(() => props.plans, fetchAllProgress, { deep: true })

const stats = computed(() => {
  const total = props.plans.length
  const active = props.plans.filter(p => p.status === 'active').length
  const completed = props.plans.filter(p => p.status === 'completed').length
  const draft = props.plans.filter(p => p.status === 'draft').length
  const progressValues = Array.from(progressMap.value.values())
  const avgProgress = progressValues.length > 0
    ? Math.round(progressValues.reduce((sum, p) => sum + p.overallProgress, 0) / progressValues.length)
    : 0
  return { total, active, completed, draft, avgProgress }
})

const hasData = computed(() => progressMap.value.size > 0)

const strategyBarOption = computed(() => {
  const strategies: { name: string; progress: number }[] = []
  progressMap.value.forEach((progress) => {
    progress.strategies.forEach(s => {
      strategies.push({
        name: `${s.strategyCode} ${s.strategyName}`,
        progress: Math.round(s.weightedProgress),
      })
    })
  })

  if (strategies.length === 0) return null

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', max: 100, name: '%' },
    yAxis: { type: 'category', data: strategies.map(s => s.name), inverse: true, axisLabel: { width: 180, overflow: 'truncate' } },
    series: [{
      type: 'bar',
      data: strategies.map(s => ({
        value: s.progress,
        itemStyle: {
          color: s.progress >= 75 ? '#18A058' : s.progress >= 50 ? '#2080F0' : s.progress >= 25 ? '#F0A020' : '#D03050',
        },
      })),
      barMaxWidth: 24,
      label: { show: true, position: 'right', formatter: '{c}%' },
    }],
  }
})

const statusDoughnutOption = computed(() => {
  const { active, completed, draft } = stats.value
  const data = [
    { value: active, name: 'กำลังดำเนินการ', itemStyle: { color: '#2080F0' } },
    { value: completed, name: 'เสร็จสิ้น', itemStyle: { color: '#18A058' } },
    { value: draft, name: 'ร่าง', itemStyle: { color: '#C0C0C0' } },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}\n{c} แผน' },
      data,
    }],
  }
})

const achievementBarOption = computed(() => {
  const planData: { name: string; low: number; mid: number; high: number; full: number }[] = []
  progressMap.value.forEach((progress, planId) => {
    const plan = props.plans.find(p => p.id === planId)
    let low = 0, mid = 0, high = 0, full = 0
    progress.strategies.forEach(s => {
      s.goals.forEach(g => {
        g.indicators.forEach(ind => {
          const pct = ind.latestProgressPct ?? 0
          if (pct >= 75) full++
          else if (pct >= 50) high++
          else if (pct >= 25) mid++
          else low++
        })
      })
    })
    if (plan && (low + mid + high + full) > 0) {
      planData.push({
        name: plan.name.length > 25 ? plan.name.slice(0, 25) + '...' : plan.name,
        low, mid, high, full,
      })
    }
  })

  if (planData.length === 0) return null

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['< 25%', '25-50%', '50-75%', '≥ 75%'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '6%', containLabel: true },
    xAxis: { type: 'category', data: planData.map(p => p.name), axisLabel: { rotate: planData.length > 3 ? 20 : 0 } },
    yAxis: { type: 'value', name: 'ตัวชี้วัด', minInterval: 1 },
    series: [
      { name: '< 25%', type: 'bar', stack: 'total', data: planData.map(p => p.low), itemStyle: { color: '#D03050' } },
      { name: '25-50%', type: 'bar', stack: 'total', data: planData.map(p => p.mid), itemStyle: { color: '#F0A020' } },
      { name: '50-75%', type: 'bar', stack: 'total', data: planData.map(p => p.high), itemStyle: { color: '#2080F0' } },
      { name: '≥ 75%', type: 'bar', stack: 'total', data: planData.map(p => p.full), itemStyle: { color: '#18A058' } },
    ],
  }
})
</script>

<template>
  <NSpin :show="loading">
    <NEmpty v-if="plans.length === 0" description="ไม่มีข้อมูลแผนในปีงบประมาณนี้" />
    <div v-else class="charts-grid">
      <NCard title="สถานะแผน" :bordered="false" class="chart-card">
        <v-chart
          v-if="statusDoughnutOption"
          :option="statusDoughnutOption"
          style="height: 260px; width: 100%"
          autoresize
        />
        <NEmpty v-else description="ไม่มีข้อมูล" />
      </NCard>

      <NCard title="ความก้าวหน้าตามกลยุทธ์" :bordered="false" class="chart-card">
        <v-chart
          v-if="strategyBarOption"
          :option="strategyBarOption"
          :style="{ height: Math.max(260, strategyBarOption!.yAxis.data.length * 36 + 60) + 'px', width: '100%' }"
          autoresize
        />
        <NEmpty v-else description="ไม่มีข้อมูลความก้าวหน้า" />
      </NCard>

      <NCard title="ตัวชี้วัดตามระดับความสำเร็จ" :bordered="false" class="chart-card chart-card--full">
        <v-chart
          v-if="achievementBarOption"
          :option="achievementBarOption"
          style="height: 300px; width: 100%"
          autoresize
        />
        <NEmpty v-else description="ไม่มีข้อมูลตัวชี้วัด" />
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.chart-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.chart-card--full {
  grid-column: 1 / -1;
}

@media (max-width: 1023px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>

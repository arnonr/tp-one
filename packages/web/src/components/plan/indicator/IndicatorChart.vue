<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { NSpin } from 'naive-ui'
import { listIndicatorUpdates } from '@/services/planApi'
import type { IndicatorUpdate } from '@/types/plan'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
])

const props = defineProps<{
  indicatorId: string
  targetValue: string
  unit?: string
}>()

const loading = ref(false)
const updates = ref<IndicatorUpdate[]>([])

async function fetchUpdates() {
  loading.value = true
  try {
    updates.value = await listIndicatorUpdates(props.indicatorId)
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(fetchUpdates)
watch(() => props.indicatorId, fetchUpdates)

const chartOption = computed(() => {
  const data = updates.value.map(u => {
    const d = new Date(u.reportedDate)
    return {
      period: `${d.getMonth() + 1}/${d.getFullYear() + 543}`,
      value: parseFloat(u.reportedValue) || 0,
    }
  })

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${p.data.period}<br/>ค่า: ${p.data.value}${props.unit ? ` ${props.unit}` : ''}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.period),
    },
    yAxis: {
      type: 'value',
      name: props.unit || 'ค่า',
    },
    series: [
      {
        name: 'ค่ารายงาน',
        type: 'line',
        data: data.map(d => d.value),
        itemStyle: { color: '#18A058' },
        smooth: true,
      },
      {
        name: 'เป้าหมาย',
        type: 'line',
        data: data.map(() => parseFloat(props.targetValue) || 0),
        itemStyle: { color: '#E03030' },
        lineStyle: { type: 'dashed' },
        symbol: 'none',
      },
    ],
  }
})
</script>

<template>
  <NSpin :show="loading" style="width: 100%">
    <v-chart :option="chartOption" style="height: 200px; width: 100%" autoresize />
  </NSpin>
</template>
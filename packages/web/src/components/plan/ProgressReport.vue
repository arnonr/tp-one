<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NCard, NSelect, NProgress, NSpin, NEmpty, NText, NGrid, NGi } from 'naive-ui'
import { getPlanProgress, listStrategies } from '@/services/planApi'
import type { Strategy, PlanProgress } from '@/types/plan'
import IndicatorChart from './IndicatorChart.vue'

const props = defineProps<{
  planId: string
}>()

const loading = ref(false)
const progressData = ref<PlanProgress | null>(null)
const strategies = ref<Strategy[]>([])
const selectedPeriod = ref<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')

const PERIOD_OPTIONS = [
  { label: 'รายสัปดาห์', value: 'weekly' },
  { label: 'รายเดือน', value: 'monthly' },
  { label: 'รายไตรมาส', value: 'quarterly' },
  { label: 'รายปี', value: 'yearly' },
]

async function fetchData() {
  loading.value = true
  try {
    const [progress, stratData] = await Promise.all([
      getPlanProgress(props.planId),
      listStrategies(props.planId),
    ])
    progressData.value = progress
    strategies.value = stratData
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function getStrategyProgress(strategyId: string): number {
  const s = progressData.value?.strategies.find(s => s.strategyId === strategyId)
  return Math.round(s?.weightedProgress ?? 0)
}

function getGoalProgress(goalId: string): number {
  for (const s of progressData.value?.strategies ?? []) {
    const g = s.goals.find(g => g.goalId === goalId)
    if (g) return Math.round(g.weightedProgress)
  }
  return 0
}

const totalProgress = computed(() => Math.round(progressData.value?.overallProgress ?? 0))
</script>

<template>
  <NSpin :show="loading">
    <div class="progress-report">
      <div class="report-header">
        <NSelect
          v-model:value="selectedPeriod"
          :options="PERIOD_OPTIONS"
          style="width: 180px"
        />
      </div>

      <NCard class="overall-progress-card" :bordered="false">
        <div class="overall-progress">
          <NText class="progress-label">ความคืบหน้ารวมทั้งแผน</NText>
          <NProgress
            type="line"
            :percentage="totalProgress"
            :height="16"
            :border-radius="8"
            indicator-placement="inside"
          />
        </div>
      </NCard>

      <div v-if="strategies.length > 0" class="strategy-progress-list">
        <NCard
          v-for="strategy in strategies"
          :key="strategy.id"
          class="strategy-progress-card"
          :bordered="false"
        >
          <template #header>
            <div class="strategy-progress-header">
              <NText class="strategy-code">{{ strategy.code }}</NText>
              <NText class="strategy-name">{{ strategy.name }}</NText>
              <NText depth="3" class="strategy-pct">{{ getStrategyProgress(strategy.id) }}%</NText>
            </div>
          </template>

          <NGrid :cols="2" :x-gap="12" :y-gap="12" v-if="strategy.goals?.length">
            <NGi v-for="goal in strategy.goals" :key="goal.id">
              <div class="goal-progress-item">
                <div class="goal-progress-header">
                  <NText class="goal-code">{{ goal.code }}</NText>
                  <NText class="goal-name">{{ goal.name }}</NText>
                </div>
                <NProgress
                  type="line"
                  :percentage="getGoalProgress(goal.id)"
                  :height="8"
                  :border-radius="4"
                  :show-indicator="false"
                />
                <NText depth="3" class="goal-pct">{{ getGoalProgress(goal.id) }}%</NText>
              </div>
            </NGi>
          </NGrid>
          <NEmpty v-else description="ยังไม่มีเป้าหมาย" size="small" />
        </NCard>
      </div>
      <NEmpty v-else description="ยังไม่มีกลยุทธ์" />
    </div>
  </NSpin>
</template>

<style scoped>
.progress-report {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.report-header {
  display: flex;
  justify-content: flex-end;
}

.overall-progress-card {
  border-radius: var(--radius-lg);
}

.overall-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.progress-label {
  font-size: var(--text-sm);
  font-weight: 500;
}

.strategy-progress-card {
  border-radius: var(--radius-lg);
}

.strategy-progress-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.strategy-code {
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.strategy-name {
  font-size: var(--text-sm);
  font-weight: 500;
  flex: 1;
}

.strategy-pct {
  font-size: var(--text-sm);
  font-weight: 600;
}

.goal-progress-item {
  padding: var(--space-sm);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.goal-progress-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.goal-code {
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.goal-name {
  font-size: var(--text-xs);
  font-weight: 500;
  flex: 1;
}

.goal-pct {
  font-size: var(--text-xs);
}
</style>
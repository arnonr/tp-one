<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NCard,
  NText,
  NIcon,
  NButton,
  NSpin,
  NTag,
  NProgress,
  NSpace,
  useMessage,
} from 'naive-ui'
import {
  ArrowBackOutline,
  TrendingUpOutline,
  CheckmarkDoneOutline,
  TimeOutline,
} from '@vicons/ionicons5'
import { useRoute, useRouter } from 'vue-router'
import {
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  createGoal,
  updateGoal,
  deleteGoal,
  createIndicator,
  updateIndicator,
  deleteIndicator,
  createIndicatorUpdate,
  getPlanProgress,
  getPlan,
} from '@/services/planApi'
import type { AnnualPlan, Strategy, Goal, Indicator, PlanProgress } from '@/types/plan'
import StrategyList from '@/components/plan/strategy/StrategyList.vue'
import IndicatorForm from '@/components/plan/indicator/IndicatorForm.vue'
import IndicatorUpdateForm from '@/components/plan/indicator/IndicatorUpdateForm.vue'
import { getFiscalYear, getFiscalQuarter, FISCAL_QUARTER_LABELS } from '@/utils/thai'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)

const plan = ref<AnnualPlan | null>(null)
const strategies = ref<Strategy[]>([])
const progressData = ref<PlanProgress | null>(null)

// Form modals
const showIndicatorForm = ref(false)
const indicatorFormLoading = ref(false)
const editingIndicator = ref<Indicator | null>(null)
const selectedGoalForIndicator = ref<Goal | null>(null)

const showUpdateForm = ref(false)
const updateFormLoading = ref(false)
const selectedIndicatorForUpdate = ref<Indicator | null>(null)

const currentFY = getFiscalYear()
const currentQ = getFiscalQuarter()

const totalIndicators = computed(() => {
  return strategies.value.reduce((sum, s) =>
    sum + (s.goals?.reduce((gs, g) => gs + (g.indicators?.length || 0), 0) || 0)
  , 0)
})

const passedIndicators = computed(() => 0)

async function fetchPlan() {
  loading.value = true
  try {
    const planId = route.params.id as string
    plan.value = await getPlan(planId)
    document.title = `${plan.value.name} — TP-One`

    strategies.value = await listStrategies(planId)

    try {
      progressData.value = await getPlanProgress(planId)
    } catch (e) {
      // no progress yet
    }
  } catch (e) {
    message.error('โหลดแผนไม่สำเร็จ')
    router.push({ name: 'plans' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchPlan)

// ========== Strategy CRUD ==========

async function handleAddStrategy(planId: string, payload: { name: string; description?: string; sortOrder?: number }) {
  try {
    await createStrategy(planId, payload)
    message.success('เพิ่มกลยุทธ์สำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ไม่สำเร็จ')
  }
}

async function handleEditStrategy(strategyId: string, payload: { name?: string; description?: string; sortOrder?: number }) {
  try {
    await updateStrategy(strategyId, payload)
    message.success('แก้ไขกลยุทธ์สำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ไม่สำเร็จ')
  }
}

function confirmDeleteStrategy(strategyId: string) {
  const strategy = strategies.value.find(s => s.id === strategyId)
  if (strategy && window.confirm(`ยืนยันลบกลยุทธ์ "${strategy.name}" และเป้าหมายภายใน?`)) {
    handleDeleteStrategy(strategyId)
  }
}

async function handleDeleteStrategy(strategyId: string) {
  try {
    await deleteStrategy(strategyId)
    message.success('ลบกลยุทธ์สำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ลบไม่สำเร็จ')
  }
}

// ========== Goal CRUD ==========

async function handleAddGoal(strategyId: string, payload: { name: string; description?: string; sortOrder?: number }) {
  try {
    await createGoal(strategyId, payload)
    message.success('เพิ่มเป้าหมายสำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ไม่สำเร็จ')
  }
}

async function handleEditGoal(goalId: string, payload: { name?: string; description?: string; sortOrder?: number }) {
  try {
    await updateGoal(goalId, payload)
    message.success('แก้ไขเป้าหมายสำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ไม่สำเร็จ')
  }
}

function confirmDeleteGoal(goalId: string) {
  // Find goal name for confirmation
  let goalName = ''
  for (const strategy of strategies.value) {
    const goal = strategy.goals?.find(g => g.id === goalId)
    if (goal) {
      goalName = goal.name
      break
    }
  }
  if (window.confirm(`ยืนยันลบเป้าหมาย "${goalName}" และตัวชี้วัดภายใน?`)) {
    handleDeleteGoal(goalId)
  }
}

async function handleDeleteGoal(goalId: string) {
  try {
    await deleteGoal(goalId)
    message.success('ลบเป้าหมายสำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ลบไม่สำเร็จ')
  }
}

// ========== Indicator CRUD ==========

function openAddIndicator(goalId: string, _payload: any) {
  // Find goal across all strategies
  for (const strategy of strategies.value) {
    const goal = strategy.goals?.find(g => g.id === goalId)
    if (goal) {
      editingIndicator.value = null
      selectedGoalForIndicator.value = goal
      showIndicatorForm.value = true
      return
    }
  }
}

function openEditIndicator(indicatorId: string) {
  // Find indicator across all strategies/goals
  for (const strategy of strategies.value) {
    for (const goal of strategy.goals || []) {
      const indicator = goal.indicators?.find(i => i.id === indicatorId)
      if (indicator) {
        editingIndicator.value = indicator
        selectedGoalForIndicator.value = goal
        showIndicatorForm.value = true
        return
      }
    }
  }
}

function confirmDeleteIndicator(indicatorId: string) {
  // Find indicator name for confirmation
  let indicatorName = ''
  for (const strategy of strategies.value) {
    for (const goal of strategy.goals || []) {
      const indicator = goal.indicators?.find(i => i.id === indicatorId)
      if (indicator) {
        indicatorName = indicator.name
        break
      }
    }
  }
  if (window.confirm(`ยืนยันลบตัวชี้วัด "${indicatorName}"?`)) {
    handleDeleteIndicator(indicatorId)
  }
}

async function handleSaveIndicator(payload: {
  name: string
  description?: string
  targetValue: string
  unit?: string
  indicatorType?: 'amount' | 'count' | 'percentage'
  weight?: number
}) {
  if (!selectedGoalForIndicator.value) return

  indicatorFormLoading.value = true
  try {
    if (editingIndicator.value) {
      await updateIndicator(editingIndicator.value.id, payload)
      message.success('แก้ไขตัวชี้วัดสำเร็จ')
    } else {
      await createIndicator(selectedGoalForIndicator.value.id, payload)
      message.success('เพิ่มตัวชี้วัดสำเร็จ')
    }
    showIndicatorForm.value = false
    await fetchPlan()
  } catch (e) {
    message.error('ไม่สำเร็จ')
  } finally {
    indicatorFormLoading.value = false
  }
}

async function handleDeleteIndicator(indicatorId: string) {
  try {
    await deleteIndicator(indicatorId)
    message.success('ลบตัวชี้วัดสำเร็จ')
    await fetchPlan()
  } catch (e) {
    message.error('ลบไม่สำเร็จ')
  }
}

// ========== Indicator Update ==========

function openAddUpdate(indicatorId: string) {
  // Find indicator
  for (const strategy of strategies.value) {
    for (const goal of strategy.goals || []) {
      const indicator = goal.indicators?.find(i => i.id === indicatorId)
      if (indicator) {
        selectedIndicatorForUpdate.value = indicator
        showUpdateForm.value = true
        return
      }
    }
  }
}

async function handleSaveUpdate(payload: {
  reportedValue: string
  reportedDate: string
  progressPct?: string
  note?: string
  evidenceUrl?: string
}) {
  if (!selectedIndicatorForUpdate.value) return

  updateFormLoading.value = true
  try {
    await createIndicatorUpdate(selectedIndicatorForUpdate.value.id, payload)
    message.success('บันทึกรายงานสำเร็จ')
    showUpdateForm.value = false
    await fetchPlan()
  } catch (e) {
    message.error('บันทึกไม่สำเร็จ')
  } finally {
    updateFormLoading.value = false
  }
}

const STATUS_CONFIG: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'default' }> = {
  active: { label: 'กำลังดำเนินการ', type: 'info' },
  draft: { label: 'ร่าง', type: 'warning' },
  completed: { label: 'เสร็จสิ้น', type: 'success' },
}
</script>

<template>
  <NSpin :show="loading">
    <div v-if="plan" class="plan-detail">
      <div class="page-header">
        <div class="header-left">
          <NButton quaternary circle @click="router.push({ name: 'plans' })">
            <template #icon><NIcon><ArrowBackOutline /></NIcon></template>
          </NButton>
          <div>
            <h1 class="page-title">{{ plan.name }}</h1>
            <NText depth="3" class="page-subtitle">
              ปีงบประมาณ {{ plan.year }} | {{ totalIndicators }} ตัวชี้วัด
            </NText>
          </div>
        </div>
        <NTag :bordered="false" :type="STATUS_CONFIG[plan.status]?.type || 'default'">
          {{ STATUS_CONFIG[plan.status]?.label || plan.status }}
        </NTag>
      </div>

      <!-- Overview Stats -->
      <div class="overview-bar">
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-primary)"><TrendingUpOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ความคืบหน้ารวม</NText>
            <div class="overview-value">{{ progressData?.overallProgress || 0 }}%</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-success)"><CheckmarkDoneOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ตัวชี้วัดที่ผ่านเป้า</NText>
            <div class="overview-value">{{ passedIndicators }} / {{ totalIndicators }}</div>
          </div>
        </div>
        <div class="overview-divider" />
        <div class="overview-stat">
          <NIcon :size="20" color="var(--color-warning)"><TimeOutline /></NIcon>
          <div>
            <NText depth="3" class="overview-label">ไตรมาสปัจจุบัน</NText>
            <div class="overview-value">{{ FISCAL_QUARTER_LABELS[currentQ] }}</div>
          </div>
        </div>
      </div>

      <!-- 4-Level Hierarchy: Strategy → Goal → Indicator -->
      <StrategyList
        :plan-id="plan.id"
        :plan-status="plan.status"
        :strategies="strategies"
        :loading="loading"
        @refresh="fetchPlan"
        @add-strategy="handleAddStrategy"
        @edit-strategy="handleEditStrategy"
        @delete-strategy="handleDeleteStrategy"
        @add-goal="handleAddGoal"
        @edit-goal="handleEditGoal"
        @delete-goal="confirmDeleteGoal"
        @add-indicator="openAddIndicator"
        @edit-indicator="openEditIndicator"
        @delete-indicator="confirmDeleteIndicator"
        @add-update="openAddUpdate"
        @reverted="fetchPlan"
      />
    </div>
  </NSpin>

  <!-- Indicator Form Modal -->
  <IndicatorForm
    v-model:show="showIndicatorForm"
    :indicator="editingIndicator"
    :loading="indicatorFormLoading"
    @save="handleSaveIndicator"
  />

  <!-- Indicator Update Form Modal -->
  <IndicatorUpdateForm
    v-if="selectedIndicatorForUpdate"
    v-model:show="showUpdateForm"
    :indicator-id="selectedIndicatorForUpdate.id"
    :indicator-name="selectedIndicatorForUpdate.name"
    :target-value="selectedIndicatorForUpdate.targetValue"
    :loading="updateFormLoading"
    @save="handleSaveUpdate"
  />
</template>

<style scoped>
.plan-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.page-subtitle {
  font-size: var(--text-sm);
  margin-top: var(--space-2xs);
}

.overview-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.overview-stat {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.overview-label {
  font-size: var(--text-xs);
  display: block;
}

.overview-value {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.overview-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border);
}
</style>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NCard,
  NIcon,
  NButton,
  NSpin,
  NTag,
  NProgress,
  NSelect,
  NButtonGroup,
  useMessage,
  NStatistic,
  NGrid,
  NGi,
  NDivider,
} from 'naive-ui'
import {
  ArrowBackOutline,
  TrendingUpOutline,
  CheckmarkDoneOutline,
  TimeOutline,
  DocumentTextOutline,
  GridOutline,
  AnalyticsOutline,
  GitNetworkOutline,
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
  exportPlanPDF,
  exportPlanExcel,
} from '@/services/planApi'
import type { AnnualPlan, Strategy, Goal, Indicator, PlanProgress } from '@/types/plan'
import StrategyList from '@/components/plan/strategy/StrategyList.vue'
import IndicatorForm from '@/components/plan/indicator/IndicatorForm.vue'
import IndicatorUpdateForm from '@/components/plan/indicator/IndicatorUpdateForm.vue'
import { getFiscalQuarter, FISCAL_QUARTER_LABELS } from '@/utils/thai'

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

const currentQ = getFiscalQuarter()

// Export
const exportPeriod = ref('monthly')
const periodOptions = [
  { label: 'รายเดือน', value: 'monthly' },
  { label: 'รายไตรมาส', value: 'quarterly' },
  { label: 'รายปี', value: 'yearly' },
]
const exporting = ref(false)

async function handleExportPDF() {
  if (!plan.value) return
  exporting.value = true
  try {
    await exportPlanPDF(plan.value.id, exportPeriod.value)
    message.success('ส่งออก PDF สำเร็จ')
  } catch {
    message.error('ส่งออก PDF ไม่สำเร็จ')
  } finally {
    exporting.value = false
  }
}

async function handleExportExcel() {
  if (!plan.value) return
  exporting.value = true
  try {
    await exportPlanExcel(plan.value.id, exportPeriod.value)
    message.success('ส่งออก Excel สำเร็จ')
  } catch {
    message.error('ส่งออก Excel ไม่สำเร็จ')
  } finally {
    exporting.value = false
  }
}

const totalIndicators = computed(() => {
  return strategies.value.reduce((sum, s) =>
    sum + (s.goals?.reduce((gs, g) => gs + (g.indicators?.length || 0), 0) || 0)
    , 0)
})

const totalGoals = computed(() => {
  return strategies.value.reduce((sum, s) => sum + (s.goals?.length || 0), 0)
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
    message.success('เพิ่มยุทธศาสตร์สำเร็จ')
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

const STATUS_CONFIG: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'default'; color: string }> = {
  active: { label: 'กำลังดำเนินการ', type: 'info', color: '#18A058' },
  draft: { label: 'ร่าง', type: 'warning', color: '#F0A020' },
  completed: { label: 'เสร็จสิ้น', type: 'success', color: '#18A058' },
}

const progressColor = computed(() => {
  const pct = progressData.value?.overallProgress || 0
  if (pct >= 80) return '#18A058'
  if (pct >= 50) return '#F0A020'
  return '#D03050'
})
</script>

<template>
  <NSpin :show="loading">
    <div v-if="plan" class="plan-detail">
      <!-- Hero Header -->
      <div class="plan-hero">
        <div class="hero-content">
          <div class="hero-top">
            <NButton quaternary circle @click="router.push({ name: 'plans' })" class="back-btn">
              <template #icon>
                <NIcon>
                  <ArrowBackOutline />
                </NIcon>
              </template>
            </NButton>
            <NTag :bordered="false" :type="STATUS_CONFIG[plan.status]?.type || 'default'" size="large" round>
              {{ STATUS_CONFIG[plan.status]?.label || plan.status }}
            </NTag>
          </div>
          <h1 class="plan-title">{{ plan.name }}</h1>
          <div class="plan-meta">
            <span class="meta-item">
              <NIcon :size="16">
                <TimeOutline />
              </NIcon>
              ปีงบประมาณ {{ plan.year }}
            </span>
            <span class="meta-sep">|</span>
            <span class="meta-item">
              <NIcon :size="16">
                <GitNetworkOutline />
              </NIcon>
              {{ strategies.length }} กลยุทธ์
            </span>
            <span class="meta-sep">|</span>
            <span class="meta-item">
              <NIcon :size="16">
                <TrendingUpOutline />
              </NIcon>
              {{ totalGoals }} เป้าหมาย
            </span>
            <span class="meta-sep">|</span>
            <span class="meta-item">
              <NIcon :size="16">
                <AnalyticsOutline />
              </NIcon>
              {{ totalIndicators }} ตัวชี้วัด
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" :item-responsive="true" class="stats-grid">
        <NGi :span="1">
          <NCard class="stat-card stat-progress" embedded>
            <div class="stat-inner">
              <div class="stat-header">
                <NIcon :size="20" color="#FF6600">
                  <TrendingUpOutline />
                </NIcon>
                <span class="stat-label">ความคืบหน้ารวม</span>
              </div>
              <div class="stat-value-row">
                <NStatistic tabular-nums>
                  <template #default>
                    <span class="stat-value" :style="{ color: progressColor }">
                      {{ progressData?.overallProgress || 0 }}%
                    </span>
                  </template>
                </NStatistic>
              </div>
              <NProgress type="line" :percentage="progressData?.overallProgress || 0" :color="progressColor"
                :show-indicator="false" :height="6" :border-radius="3" class="stat-progress-bar" />
            </div>
          </NCard>
        </NGi>
        <NGi :span="1">
          <NCard class="stat-card stat-indicators" embedded>
            <div class="stat-inner">
              <div class="stat-header">
                <NIcon :size="20" color="#18A058">
                  <CheckmarkDoneOutline />
                </NIcon>
                <span class="stat-label">ตัวชี้วัดที่ผ่านเป้า</span>
              </div>
              <div class="stat-value-row">
                <NStatistic tabular-nums>
                  <template #default>
                    <span class="stat-value success">{{ passedIndicators }}</span>
                  </template>
                </NStatistic>
                <span class="stat-divider">/</span>
                <span class="stat-total">{{ totalIndicators }}</span>
              </div>
            </div>
          </NCard>
        </NGi>
        <NGi :span="1">
          <NCard class="stat-card stat-quarter" embedded>
            <div class="stat-inner">
              <div class="stat-header">
                <NIcon :size="20" color="#F0A020">
                  <TimeOutline />
                </NIcon>
                <span class="stat-label">ไตรมาสปัจจุบัน</span>
              </div>
              <div class="stat-value-row">
                <NStatistic tabular-nums>
                  <template #default>
                    <span class="stat-value warning">{{ FISCAL_QUARTER_LABELS[currentQ] }}</span>
                  </template>
                </NStatistic>
              </div>
            </div>
          </NCard>
        </NGi>
        <NGi :span="1">
          <NCard class="stat-card stat-export" embedded>
            <div class="stat-inner">
              <div class="stat-header">
                <span class="stat-label">ส่งออกรายงาน</span>
              </div>
              <div class="export-controls">
                <NSelect v-model:value="exportPeriod" :options="periodOptions" size="small" class="period-select" />
                <NButtonGroup size="small">
                  <NButton :loading="exporting" @click="handleExportPDF" class="export-btn">
                    <template #icon>
                      <NIcon>
                        <DocumentTextOutline />
                      </NIcon>
                    </template>
                    PDF
                  </NButton>
                  <NButton :loading="exporting" @click="handleExportExcel" class="export-btn">
                    <template #icon>
                      <NIcon>
                        <GridOutline />
                      </NIcon>
                    </template>
                    Excel
                  </NButton>
                </NButtonGroup>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <NDivider />

      <!-- 4-Level Hierarchy: Strategy → Goal → Indicator -->
      <div class="strategy-section">
        <h2 class="section-title">
          <NIcon :size="20" color="#FF6600">
            <GitNetworkOutline />
          </NIcon>
          โครงสร้างแผนงาน
        </h2>
        <StrategyList :plan-id="plan.id" :plan-status="plan.status" :strategies="strategies" :loading="loading"
          @refresh="fetchPlan" @add-strategy="handleAddStrategy" @edit-strategy="handleEditStrategy"
          @delete-strategy="confirmDeleteStrategy" @add-goal="handleAddGoal" @edit-goal="handleEditGoal"
          @delete-goal="confirmDeleteGoal" @add-indicator="openAddIndicator" @edit-indicator="openEditIndicator"
          @delete-indicator="confirmDeleteIndicator" @add-update="openAddUpdate" @reverted="fetchPlan" />
      </div>
    </div>
  </NSpin>

  <!-- Indicator Form Modal -->
  <IndicatorForm v-model:show="showIndicatorForm" :indicator="editingIndicator" :loading="indicatorFormLoading"
    @save="handleSaveIndicator" />

  <!-- Indicator Update Form Modal -->
  <IndicatorUpdateForm v-if="selectedIndicatorForUpdate" v-model:show="showUpdateForm"
    :indicator-id="selectedIndicatorForUpdate.id" :indicator-name="selectedIndicatorForUpdate.name"
    :target-value="selectedIndicatorForUpdate.targetValue" :loading="updateFormLoading" @save="handleSaveUpdate" />
</template>

<style scoped>
.plan-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* Hero Header */
.plan-hero {
  background: linear-gradient(135deg, #FF6600 0%, #FF8533 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  color: white;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  color: white !important;
  --n-text-color-hover: rgba(255, 255, 255, 0.85) !important;
  --n-text-color-pressed: rgba(255, 255, 255, 0.7) !important;
}

.plan-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  line-height: var(--leading-tight);
  margin: 0;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  opacity: 0.9;
  font-size: var(--text-sm);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
}

.meta-sep {
  opacity: 0.5;
}

/* Stats Cards - Equal Height Grid */
.stats-grid {
  display: flex;
}

.stats-grid>* {
  display: flex;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary, #666);
  font-weight: 500;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2xs);
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 700;
}

.stat-value.success {
  color: #18A058;
}

.stat-value.warning {
  color: #F0A020;
}

.stat-divider {
  font-size: var(--text-lg);
  color: var(--color-text-secondary, #666);
}

.stat-total {
  font-size: var(--text-md);
  color: var(--color-text-secondary, #666);
}

.stat-progress-bar {
  margin-top: auto;
  /* Push to bottom for alignment */
}

/* Export Controls */
.export-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.period-select {
  width: 100%;
}

.export-btn {
  flex: 1;
}

/* Section */
.strategy-section {
  margin-top: var(--space-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-md);
}

/* Responsive */
@media (max-width: 768px) {
  .plan-hero {
    padding: var(--space-md);
  }

  .plan-title {
    font-size: var(--text-lg);
  }

  .plan-meta {
    font-size: var(--text-xs);
  }
}
</style>
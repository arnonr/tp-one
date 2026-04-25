<script setup lang="ts">
import { ref, watch } from 'vue'
import { NCollapse, NCollapseItem, NButton, NIcon, useMessage } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { Strategy, Goal } from '@/types/plan'
import StrategyCard from './StrategyCard.vue'
import StrategyForm from './StrategyForm.vue'
import GoalForm from '@/components/plan/goal/GoalForm.vue'

const props = defineProps<{
  planId: string
  planStatus?: 'draft' | 'active' | 'completed'
  strategies: Strategy[]
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  addStrategy: [planId: string, payload: { name: string; description?: string; sortOrder?: number }]
  editStrategy: [strategyId: string, payload: { name?: string; description?: string; sortOrder?: number }]
  deleteStrategy: [strategyId: string]
  addGoal: [strategyId: string, payload: { name: string; description?: string; sortOrder?: number }]
  editGoal: [goalId: string, payload: { name?: string; description?: string; sortOrder?: number }]
  deleteGoal: [goalId: string]
  addIndicator: [goalId: string, payload: { name: string; description?: string; targetValue: string; unit?: string; indicatorType?: string; weight?: number }]
  editIndicator: [indicatorId: string, payload: { name?: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; weight?: number }]
  deleteIndicator: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()

const message = useMessage()

const showStrategyForm = ref(false)
const editingStrategy = ref<Strategy | null>(null)
const strategyFormLoading = ref(false)

const showGoalForm = ref(false)
const selectedStrategyForGoal = ref<Strategy | null>(null)
const editingGoal = ref<Goal | null>(null)
const goalFormLoading = ref(false)

const expandedStrategies = ref<string[]>([])

// Expand all strategies by default
if (props.strategies.length > 0 && expandedStrategies.value.length === 0) {
  expandedStrategies.value = props.strategies.map(s => s.id)
}

// Watch for strategies changes and expand all
watch(() => props.strategies, (newStrategies) => {
  if (newStrategies.length > 0 && expandedStrategies.value.length === 0) {
    expandedStrategies.value = newStrategies.map(s => s.id)
  }
}, { immediate: true })

function openAddStrategy() {
  editingStrategy.value = null
  showStrategyForm.value = true
}

function openEditStrategy(strategy: Strategy) {
  editingStrategy.value = strategy
  showStrategyForm.value = true
}

async function handleSaveStrategy(payload: { name: string; description?: string; sortOrder?: number }) {
  strategyFormLoading.value = true
  try {
    if (editingStrategy.value) {
      emit('editStrategy', editingStrategy.value.id, payload)
    } else {
      emit('addStrategy', props.planId, payload)
    }
    showStrategyForm.value = false
  } finally {
    strategyFormLoading.value = false
  }
}

function confirmDeleteStrategy(strategy: Strategy) {
  if (window.confirm(`ยืนยันลบกลยุทธ์ "${strategy.name}" และเป้าหมายภายใน?`)) {
    emit('deleteStrategy', strategy.id)
  }
}

function openAddGoalViaStrategyId(strategyId: string) {
  const strategy = props.strategies.find(s => s.id === strategyId)
  if (!strategy) return
  selectedStrategyForGoal.value = strategy
  editingGoal.value = null
  showGoalForm.value = true
}

function openEditGoalViaGoalId(goalId: string) {
  for (const strategy of props.strategies) {
    const goal = strategy.goals?.find(g => g.id === goalId)
    if (goal) {
      editingGoal.value = goal
      selectedStrategyForGoal.value = strategy
      showGoalForm.value = true
      return
    }
  }
}

async function handleSaveGoal(payload: { name: string; description?: string; sortOrder?: number }) {
  if (!selectedStrategyForGoal.value) return
  goalFormLoading.value = true
  try {
    if (editingGoal.value) {
      emit('editGoal', editingGoal.value.id, payload)
    } else {
      emit('addGoal', selectedStrategyForGoal.value.id, payload)
    }
    showGoalForm.value = false
  } finally {
    goalFormLoading.value = false
  }
}

function confirmDeleteGoal(goalId: string) {
  let goalName = ''
  for (const strategy of props.strategies) {
    const goal = strategy.goals?.find(g => g.id === goalId)
    if (goal) {
      goalName = goal.name
      break
    }
  }
  if (window.confirm(`ยืนยันลบเป้าหมาย "${goalName}" และตัวชี้วัดภายใน?`)) {
    emit('deleteGoal', goalId)
  }
}

function openAddIndicatorViaGoalId(goalId: string, _payload: any) {
  emit('addIndicator', goalId, _payload)
}

function openEditIndicator(indicatorId: string) {
  emit('editIndicator', indicatorId, { name: '', description: '', targetValue: '', unit: '', indicatorType: 'amount', weight: 1 })
}

function confirmDeleteIndicator(indicatorId: string) {
  emit('deleteIndicator', indicatorId)
}

// Card-level handlers that adapt StrategyCard's emit to StrategyList's internal handlers
function handleEditFromCard(strategy: Strategy) {
  openEditStrategy(strategy)
}

function handleDeleteFromCard(strategy: Strategy) {
  confirmDeleteStrategy(strategy)
}

function handleAddGoalFromCard(strategyId: string, _payload: any) {
  openAddGoalViaStrategyId(strategyId)
}

function handleAddIndicatorFromCard(goalId: string, payload: any) {
  openAddIndicatorViaGoalId(goalId, payload)
}
</script>

<template>
  <div class="strategy-list">
    <div class="strategy-list-header">
      <NButton v-if="planStatus !== 'completed'" type="primary" size="small" @click="openAddStrategy">
        <template #icon>
          <NIcon>
            <AddOutline />
          </NIcon>
        </template>
        เพิ่มยุทธศาสตร์
      </NButton>
    </div>

    <NCollapse v-if="strategies.length > 0" :expanded-names="expandedStrategies"
      @update:expanded-names="(val) => (expandedStrategies = val)">
      <NCollapseItem v-for="strategy in strategies" :key="strategy.id" :name="strategy.id">
        <template #header>
          <div class="collapse-header">
            <span class="strategy-code-badge">{{ strategy.code }}</span>
            <span class="strategy-label">{{ strategy.name }}</span>
          </div>
        </template>
        <StrategyCard :strategy="strategy" :plan-status="planStatus" @edit="handleEditFromCard"
          @delete="handleDeleteFromCard" @add-goal="handleAddGoalFromCard"
          @edit-goal="(_id, _payload) => openEditGoalViaGoalId(_id)" @delete-goal="confirmDeleteGoal"
          @add-indicator="handleAddIndicatorFromCard" @edit-indicator="(_id) => openEditIndicator(_id)"
          @delete-indicator="confirmDeleteIndicator" @add-update="(_id) => emit('addUpdate', _id)"
          @reverted="emit('reverted')" />
      </NCollapseItem>
    </NCollapse>
    <div v-else class="empty-state">
      <p>ยังไม่มียุทธศาสตร์ในแผนนี้</p>
      <NButton size="small" @click="openAddStrategy">เพิ่มยุทธศาสตร์แรก</NButton>
    </div>
  </div>

  <StrategyForm v-model:show="showStrategyForm" :strategy="editingStrategy" :loading="strategyFormLoading"
    @save="handleSaveStrategy" />

  <GoalForm v-model:show="showGoalForm" :goal="editingGoal" :loading="goalFormLoading" @save="handleSaveGoal" />
</template>

<style scoped>
.strategy-list-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-md);
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.strategy-code-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  background: #FFF0E6;
  color: #FF6600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.strategy-label {
  font-size: var(--text-sm);
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.empty-state p {
  margin-bottom: var(--space-md);
}
</style>
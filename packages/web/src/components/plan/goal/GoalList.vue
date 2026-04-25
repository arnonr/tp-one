<script setup lang="ts">
import { computed } from 'vue'
import { NCollapse, NCollapseItem } from 'naive-ui'
import type { Goal } from '@/types/plan'
import GoalCard from './GoalCard.vue'

const props = defineProps<{
  strategyId: string
  goals: Goal[]
  planStatus?: 'draft' | 'active' | 'completed'
}>()

const emit = defineEmits<{
  editGoal: [goalId: string, payload: { name?: string; description?: string; sortOrder?: number }]
  deleteGoal: [goalId: string]
  addIndicator: [goalId: string, payload: { name: string; description?: string; targetValue: string; unit?: string; indicatorType?: string; weight?: number }]
  editIndicator: [indicatorId: string, payload: { name?: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; weight?: number }]
  deleteIndicator: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()

const strategyCode = computed(() => {
  if (props.goals.length > 0) {
    const firstGoal = props.goals[0]
    const parts = firstGoal.code.split('-')
    if (parts.length >= 2) {
      return parts[0]
    }
  }
  return ''
})

function handleEditGoal(goalId: string) {
  const goal = props.goals.find(g => g.id === goalId)
  if (goal) {
    emit('editGoal', goal.id, { name: goal.name, description: goal.description, sortOrder: goal.sortOrder })
  }
}

function handleDeleteGoal(goalId: string) {
  emit('deleteGoal', goalId)
}

function handleAddIndicator(goalId: string) {
  emit('addIndicator', goalId, {
    name: '',
    description: '',
    targetValue: '',
    unit: '',
    indicatorType: 'amount',
    weight: 1,
  })
}

function handleEditIndicator(indicatorId: string) {
  // Find indicator from goals
  for (const goal of props.goals) {
    const indicator = goal.indicators?.find(i => i.id === indicatorId)
    if (indicator) {
      emit('editIndicator', indicator.id, {
        name: indicator.name,
        description: indicator.description,
        targetValue: indicator.targetValue,
        unit: indicator.unit,
        indicatorType: indicator.indicatorType,
        weight: indicator.weight,
      })
      return
    }
  }
}

function handleDeleteIndicator(indicatorId: string) {
  emit('deleteIndicator', indicatorId)
}
</script>

<template>
  <div class="goal-list">
    <NCollapse>
      <NCollapseItem
        v-for="goal in goals"
        :key="goal.id"
        :name="goal.id"
      >
        <template #header>
          <div class="collapse-header">
            <span class="goal-code-badge">{{ goal.code }}</span>
            <span class="goal-label">{{ goal.name }}</span>
          </div>
        </template>
        <GoalCard
          :goal="goal"
          :strategy-code="strategyCode"
          :plan-status="planStatus"
          @edit="handleEditGoal"
          @delete="handleDeleteGoal"
          @add-indicator="handleAddIndicator"
          @edit-indicator="handleEditIndicator"
          @delete-indicator="handleDeleteIndicator"
          @add-update="(id: string) => emit('addUpdate', id)"
          @reverted="emit('reverted')"
        />
      </NCollapseItem>
    </NCollapse>
  </div>
</template>

<style scoped>
.goal-list {
  margin-top: var(--space-sm);
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.goal-code-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.goal-label {
  font-size: var(--text-xs);
  font-weight: 500;
}
</style>
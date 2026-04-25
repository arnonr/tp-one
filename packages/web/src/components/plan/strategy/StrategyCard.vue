<script setup lang="ts">
import { NCard, NText, NButton, NIcon, NSpace, NTag } from 'naive-ui'
import { CreateOutline, TrashOutline, AddOutline } from '@vicons/ionicons5'
import { computed } from 'vue'
import type { Strategy, Goal } from '@/types/plan'
import GoalList from '@/components/plan/goal/GoalList.vue'

const props = defineProps<{
  strategy: Strategy
  planStatus?: 'draft' | 'active' | 'completed'
}>()

const emit = defineEmits<{
  edit: [strategy: Strategy]
  delete: [strategy: Strategy]
  addGoal: [strategyId: string, payload: { name: string; description?: string; sortOrder?: number }]
  editGoal: [goalId: string, payload: { name?: string; description?: string; sortOrder?: number }]
  deleteGoal: [goalId: string]
  addIndicator: [goalId: string, payload: { name: string; description?: string; targetValue: string; unit?: string; indicatorType?: string; weight?: number }]
  editIndicator: [indicatorId: string, payload: { name?: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; weight?: number }]
  deleteIndicator: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()

const codeLabel = computed(() => {
  const parts = props.strategy.code.split('-')
  return parts[parts.length - 1] || props.strategy.code
})

const goalCount = computed(() => props.strategy.goals?.length || 0)
const indicatorCount = computed(() =>
  props.strategy.goals?.reduce((sum, g) => sum + (g.indicators?.length || 0), 0) || 0
)

function handleAddGoal() {
  emit('addGoal', props.strategy.id, {
    name: '',
    description: '',
    sortOrder: 0,
  })
}

function handleEdit() {
  emit('edit', props.strategy)
}

function handleDelete() {
  emit('delete', props.strategy)
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
</script>

<template>
  <NCard class="strategy-card" :bordered="false" size="small">
    <template #header>
      <div class="strategy-header">
        <div class="strategy-meta">
          <NTag :bordered="false" size="small" type="info">{{ codeLabel }}</NTag>
          <div class="strategy-info">
            <NText class="strategy-name">{{ strategy.name }}</NText>
            <NText depth="3" class="strategy-stats">
              {{ goalCount }} เป้าหมาย | {{ indicatorCount }} ตัวชี้วัด
            </NText>
          </div>
        </div>
        <NSpace :size="4" align="center" no-wrap>
          <NButton
            v-if="planStatus !== 'completed'"
            size="tiny"
            quaternary
            @click="handleAddGoal"
          >
            <template #icon><NIcon><AddOutline /></NIcon></template>
          </NButton>
          <NButton size="tiny" quaternary @click="handleEdit">
            <template #icon><NIcon><CreateOutline /></NIcon></template>
          </NButton>
          <NButton size="tiny" quaternary type="error" @click="handleDelete">
            <template #icon><NIcon><TrashOutline /></NIcon></template>
          </NButton>
        </NSpace>
      </div>
    </template>

    <p v-if="strategy.description" class="strategy-description">
      {{ strategy.description }}
    </p>

    <GoalList
      v-if="goalCount > 0"
      :strategy-id="strategy.id"
      :goals="strategy.goals || []"
      :plan-status="planStatus"
      @edit-goal="(id, payload) => emit('editGoal', id, payload)"
      @delete-goal="(id) => emit('deleteGoal', id)"
      @add-indicator="handleAddIndicator"
      @edit-indicator="(id, payload) => emit('editIndicator', id, payload)"
      @delete-indicator="(id) => emit('deleteIndicator', id)"
      @add-update="(id) => emit('addUpdate', id)"
      @reverted="emit('reverted')"
    />
    <NText v-else depth="3" class="no-goals">ยังไม่มีเป้าหมาย</NText>
  </NCard>
</template>

<style scoped>
.strategy-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-md);
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.strategy-meta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.strategy-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.strategy-name {
  font-size: var(--text-sm);
  font-weight: 600;
}

.strategy-stats {
  font-size: var(--text-xs);
}

.strategy-description {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--space-sm) 0;
}

.no-goals {
  font-size: var(--text-xs);
  font-style: italic;
}
</style>
<script setup lang="ts">
import { NCard, NText, NButton, NIcon, NSpace, NTag } from 'naive-ui'
import { CreateOutline, TrashOutline, AddOutline } from '@vicons/ionicons5'
import { computed } from 'vue'
import type { Goal } from '@/types/plan'
import IndicatorList from '@/components/plan/indicator/IndicatorList.vue'

const props = defineProps<{
  goal: Goal
  strategyCode: string
  planStatus?: 'draft' | 'active' | 'completed'
}>()

const emit = defineEmits<{
  edit: [goalId: string]
  delete: [goalId: string]
  addIndicator: [goalId: string]
  editIndicator: [indicatorId: string]
  deleteIndicator: [indicatorId: string]
  addUpdate: [indicatorId: string]
}>()

const codeLabel = computed(() => {
  const parts = props.goal.code.split('-')
  return parts[parts.length - 1] || props.goal.code
})

const indicatorCount = computed(() => props.goal.indicators?.length || 0)

function handleEdit() {
  emit('edit', props.goal.id)
}

function handleDelete() {
  emit('delete', props.goal.id)
}

function handleAddIndicator() {
  emit('addIndicator', props.goal.id)
}

// Forward methods that receive indicatorId as string (from IndicatorList which properly typed)
function handleIndicatorEdit(indicatorId: string) {
  emit('editIndicator', indicatorId)
}

function handleIndicatorDelete(indicatorId: string) {
  emit('deleteIndicator', indicatorId)
}

function handleIndicatorAddUpdate(indicatorId: string) {
  emit('addUpdate', indicatorId)
}
</script>

<template>
  <NCard class="goal-card" :bordered="false" size="small">
    <template #header>
      <div class="goal-header">
        <div class="goal-meta">
          <NTag :bordered="false" size="small" type="warning">{{ codeLabel }}</NTag>
          <div class="goal-info">
            <NText class="goal-name">{{ goal.name }}</NText>
            <NText depth="3" class="goal-stats">{{ indicatorCount }} ตัวชี้วัด</NText>
          </div>
        </div>
        <NSpace :size="4" align="center" no-wrap>
          <NButton
            v-if="planStatus !== 'completed'"
            size="tiny"
            quaternary
            @click="handleAddIndicator"
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

    <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>

    <IndicatorList
      v-if="indicatorCount > 0"
      :goal-id="goal.id"
      :goal-code="goal.code"
      :indicators="goal.indicators || []"
      :plan-status="planStatus"
      @edit="handleIndicatorEdit"
      @delete="handleIndicatorDelete"
      @add-update="handleIndicatorAddUpdate"
    />
    <NText v-else depth="3" class="no-indicators">ยังไม่มีตัวชี้วัด</NText>
  </NCard>
</template>

<style scoped>
.goal-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-sm);
  background: var(--color-surface);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.goal-meta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.goal-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goal-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.goal-stats {
  font-size: var(--text-xs);
}

.goal-description {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--space-sm) 0;
}

.no-indicators {
  font-size: var(--text-xs);
  font-style: italic;
}
</style>
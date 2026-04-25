<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { Indicator } from '@/types/plan'
import IndicatorCard from './IndicatorCard.vue'

const props = defineProps<{
  goalId: string
  goalCode: string
  indicators: Indicator[]
  planStatus?: 'draft' | 'active' | 'completed'
}>()

const emit = defineEmits<{
  addIndicator: [goalId: string]
  edit: [indicatorId: string]
  delete: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()

function handleAddIndicator() {
  emit('addIndicator', props.goalId)
}

function handleEditIndicator(indicator: Indicator) {
  emit('edit', indicator.id)
}

function handleDeleteIndicator(indicator: Indicator) {
  emit('delete', indicator.id)
}

function handleAddUpdate(indicator: Indicator) {
  emit('addUpdate', indicator.id)
}
</script>

<template>
  <div class="indicator-list">
    <div v-if="planStatus !== 'completed'" class="indicator-list-header">
      <NButton size="tiny" quaternary @click="handleAddIndicator">
        <template #icon><NIcon><AddOutline /></NIcon></template>
        เพิ่มตัวชี้วัด
      </NButton>
    </div>

    <div class="indicator-cards">
      <IndicatorCard
        v-for="indicator in indicators"
        :key="indicator.id"
        :indicator="indicator"
        :goal-code="goalCode"
        :plan-status="planStatus"
        @edit="(id: string) => emit('edit', id)"
        @delete="(id: string) => emit('delete', id)"
        @add-update="(id: string) => emit('addUpdate', id)"
        @reverted="emit('reverted')"
      />
    </div>
  </div>
</template>

<style scoped>
.indicator-list {
  margin-top: var(--space-sm);
}

.indicator-list-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-sm);
}

.indicator-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
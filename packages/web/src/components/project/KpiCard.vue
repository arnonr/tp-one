<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NText, NProgress, NButton, NIcon, NDropdown } from 'naive-ui'
import { createOutline, trashOutline, timeOutline } from '@vicons/ionicons5'

const props = defineProps<{
  kpi: {
    id: string
    name: string
    targetValue: string
    currentValue?: string
    unit?: string
    period?: string
  }
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const PERCENT = computed(() => {
  const target = parseFloat(props.kpi.targetValue)
  const current = parseFloat(props.kpi.currentValue ?? '0')
  if (!target) return 0
  return Math.min(100, Math.round((current / target) * 100))
})

const STATUS_COLOR = computed(() => {
  if (PERCENT.value >= 100) return 'var(--color-success)'
  if (PERCENT.value >= 50) return 'var(--color-primary)'
  return 'var(--color-warning)'
})

const PERIOD_LABEL: Record<string, string> = {
  monthly: 'รายเดือน',
  quarterly: 'รายไตรมาส',
  yearly: 'รายปี',
}

const options = [
  { label: 'แก้ไข', key: 'edit' },
  { label: 'ลบ', key: 'delete' },
]

function handleSelect(key: string) {
  if (key === 'edit') emit('edit')
  if (key === 'delete') emit('delete')
}
</script>

<template>
  <NCard :bordered="false" class="kpi-card" hoverable>
    <div class="kpi-header">
      <NText class="kpi-name">{{ kpi.name }}</NText>
      <NDropdown :options="options" @select="handleSelect" trigger="click">
        <NButton quaternary circle size="tiny">
          <template #icon><NIcon><CreateOutline /></NIcon></template>
        </NButton>
      </NDropdown>
    </div>

    <div class="kpi-body">
      <div class="kpi-values">
        <NText class="kpi-current">{{ kpi.currentValue ?? '0' }}</NText>
        <NText depth="3" class="kpi-sep">/</NText>
        <NText depth="3" class="kpi-target">{{ kpi.targetValue }} {{ kpi.unit ?? '' }}</NText>
      </div>

      <NProgress
        type="line"
        :percentage="PERCENT"
        :height="6"
        :border-radius="3"
        :show-indicator="false"
        :color="STATUS_COLOR"
      />

      <div class="kpi-footer">
        <NText depth="3" class="kpi-percent">{{ PERCENT }}%</NText>
        <NText v-if="kpi.period" depth="3" class="kpi-period">
          {{ PERIOD_LABEL[kpi.period] }}
        </NText>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.kpi-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-sm);
}

.kpi-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  flex: 1;
  padding-right: var(--space-xs);
}

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.kpi-values {
  display: flex;
  align-items: baseline;
  gap: var(--space-2xs);
}

.kpi-current {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

.kpi-sep {
  font-size: var(--text-sm);
}

.kpi-target {
  font-size: var(--text-sm);
}

.kpi-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-percent {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.kpi-period {
  font-size: var(--text-xs);
}
</style>
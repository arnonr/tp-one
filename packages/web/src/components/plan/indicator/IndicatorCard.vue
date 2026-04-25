<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NCard, NText, NButton, NIcon, NSpace, NTag, NProgress } from 'naive-ui'
import { CreateOutline, TrashOutline, AddOutline, StatsChartOutline, TimeOutline } from '@vicons/ionicons5'
import type { Indicator, IndicatorUpdate } from '@/types/plan'
import IndicatorAssignees from './IndicatorAssignees.vue'
import IndicatorChart from './IndicatorChart.vue'
import IndicatorAuditLog from './IndicatorAuditLog.vue'
import { listIndicatorUpdates } from '@/services/planApi'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  indicator: Indicator
  goalCode: string
  planStatus?: 'draft' | 'active' | 'completed'
}>()

const emit = defineEmits<{
  edit: [indicatorId: string]
  delete: [indicatorId: string]
  addUpdate: [indicatorId: string]
  reverted: []
}>()

const latestUpdate = ref<IndicatorUpdate | null>(null)
const showChart = ref(false)
const showAudit = ref(false)
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')

async function fetchLatestUpdate() {
  try {
    const updates = await listIndicatorUpdates(props.indicator.id)
    latestUpdate.value = updates.length > 0 ? updates[updates.length - 1] : null
  } catch (e) {
    // ignore
  }
}

onMounted(fetchLatestUpdate)

const codeLabel = props.indicator.code.includes('-')
  ? props.indicator.code.split('-').pop()
  : props.indicator.code

function getProgressPercent(): number {
  if (!latestUpdate.value || !props.indicator.targetValue) return 0
  const reported = parseFloat(latestUpdate.value.reportedValue) || 0
  const target = parseFloat(props.indicator.targetValue) || 0
  if (target === 0) return 0
  return Math.min(Math.round((reported / target) * 100), 100)
}

function handleEdit() {
  emit('edit', props.indicator.id)
}

function handleDelete() {
  emit('delete', props.indicator.id)
}

function handleAddUpdate() {
  emit('addUpdate', props.indicator.id)
}
</script>

<template>
  <NCard class="indicator-card" :bordered="false" size="small">
    <div class="indicator-header">
      <div class="indicator-meta">
        <NTag :bordered="false" size="small" type="success">{{ codeLabel }}</NTag>
        <div class="indicator-info">
          <NText class="indicator-name">{{ indicator.name }}</NText>
          <NText depth="3" class="indicator-target">
            เป้าหมาย: {{ indicator.targetValue }} {{ indicator.unit || '' }}
          </NText>
        </div>
      </div>
      <NSpace :size="4" align="center" no-wrap>
        <NButton
          v-if="latestUpdate"
          size="tiny"
          quaternary
          @click="showChart = !showChart"
        >
          <template #icon><NIcon><StatsChartOutline /></NIcon></template>
        </NButton>
        <NButton size="tiny" quaternary @click="showAudit = !showAudit">
          <template #icon><NIcon><TimeOutline /></NIcon></template>
        </NButton>
        <NButton
          v-if="planStatus !== 'completed'"
          size="tiny"
          quaternary
          @click="handleAddUpdate"
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

    <p v-if="indicator.description" class="indicator-description">
      {{ indicator.description }}
    </p>

    <div v-if="indicator.assignees && indicator.assignees.length > 0" class="indicator-assignees-wrap">
      <IndicatorAssignees :assignees="indicator.assignees" :max-display="3" />
    </div>

    <div v-if="latestUpdate" class="indicator-progress">
      <NProgress
        type="line"
        :percentage="getProgressPercent()"
        :height="6"
        :border-radius="3"
        :show-indicator="false"
      />
      <div class="progress-info">
        <NText depth="3" class="latest-value">
          ล่าสุด: {{ latestUpdate.reportedValue }} {{ indicator.unit || '' }}
        </NText>
        <NText depth="3" class="latest-period">
          {{ new Date(latestUpdate.reportedDate).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }) }}
        </NText>
      </div>
    </div>
    <NText v-else depth="3" class="no-updates">ยังไม่มีรายงานความคืบหน้า</NText>

    <IndicatorChart
      v-if="showChart && latestUpdate"
      :indicator-id="indicator.id"
      :target-value="indicator.targetValue"
      :unit="indicator.unit"
    />

    <IndicatorAuditLog
      v-if="showAudit"
      :indicator-id="indicator.id"
      :is-admin="isAdmin"
      @reverted="emit('reverted')"
    />
  </NCard>
</template>

<style scoped>
.indicator-card {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-sm);
  background: var(--color-surface);
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.indicator-meta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.indicator-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.indicator-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.indicator-target {
  font-size: var(--text-xs);
}

.indicator-description {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--space-sm) 0;
}

.indicator-assignees-wrap {
  margin: var(--space-sm) 0;
}

.indicator-progress {
  margin-top: var(--space-sm);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2xs);
}

.latest-value,
.latest-period {
  font-size: var(--text-xs);
}

.no-updates {
  font-size: var(--text-xs);
  font-style: italic;
}
</style>
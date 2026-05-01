<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  NDataTable, NButton, NIcon, NProgress, NDrawer, NDrawerContent, NSpace, NPopover, NSelect
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  AddOutline, CreateOutline, TrashOutline, StatsChartOutline
} from '@vicons/ionicons5'
import type { Strategy, Goal, Indicator, PlanProgress, IndicatorProgress, PlanItemStatus } from '@/types/plan'
import StrategyForm from './StrategyForm.vue'
import GoalForm from '@/components/plan/goal/GoalForm.vue'
import IndicatorForm from '@/components/plan/indicator/IndicatorForm.vue'
import { PLAN_ITEM_STATUS_OPTIONS } from '@/composables/usePlanStatus'

const props = defineProps<{
  planId: string
  planStatus?: 'draft' | 'active' | 'completed'
  strategies: Strategy[]
  loading?: boolean
  progressData?: PlanProgress | null
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
  updateStrategyStatus: [strategyId: string, payload: { status: PlanItemStatus }]
  updateGoalStatus: [goalId: string, payload: { status: PlanItemStatus }]
  updateIndicatorStatus: [indicatorId: string, payload: { status: PlanItemStatus }]
}>()

// ===== Progress lookup =====
const progressMap = computed(() => {
  const map = new Map<string, IndicatorProgress>()
  if (!props.progressData) return map
  for (const sp of props.progressData.strategies) {
    for (const gp of sp.goals) {
      for (const ip of gp.indicators) {
        map.set(ip.indicatorId, ip)
      }
    }
  }
  return map
})

// ===== Tree row type =====
interface PlanRow {
  id: string
  type: 'strategy' | 'goal' | 'indicator'
  code: string
  name: string
  status: PlanItemStatus
  description?: string
  goalCount?: number
  totalIndicatorCount?: number
  indicatorCount?: number
  targetValue?: string
  unit?: string
  currentValue?: string
  assignees?: Indicator['assignees']
  progress?: number
  children?: PlanRow[]
}

// ===== Build tree data =====
const treeData = computed<PlanRow[]>(() =>
  props.strategies.map(s => ({
    id: s.id,
    type: 'strategy' as const,
    code: s.code,
    name: s.name,
    status: s.status,
    description: s.description,
    goalCount: s.goals?.length || 0,
    totalIndicatorCount: s.goals?.reduce((sum, g) => sum + (g.indicators?.length || 0), 0) || 0,
    children: s.goals?.map(g => ({
      id: g.id,
      type: 'goal' as const,
      code: g.code,
      name: g.name,
      status: g.status,
      description: g.description,
      indicatorCount: g.indicators?.length || 0,
      children: g.indicators?.map(i => ({
        id: i.id,
        type: 'indicator' as const,
        code: i.code,
        name: i.name,
        status: i.status,
        description: i.description,
        targetValue: i.targetValue,
        unit: i.unit,
        currentValue: progressMap.value.get(i.id)?.latestValue,
        assignees: i.assignees,
        progress: progressMap.value.get(i.id)?.latestProgressPct,
      }))
    }))
  }))
)

// ===== Helper: icon button =====
function actionBtn(icon: any, title: string, onClick: () => void, type?: 'error') {
  return h(
    NButton,
    { size: 'tiny', tertiary: true, type: type || 'default', onClick, title, style: 'cursor: pointer' },
    { icon: () => h(NIcon, { size: 14 }, () => h(icon)) }
  )
}

// ===== Columns =====
const columns: DataTableColumns<PlanRow> = [
  {
    title: 'รหัส',
    key: 'code',
    width: 80,
    render(row) {
      return h('span', { style: 'font-size: 11px; color: var(--color-text-tertiary); font-family: monospace' }, row.code)
    },
  },
  {
    title: 'ชื่อ',
    key: 'name',
    minWidth: 220,
    render(row) {
      const nameStyle = row.type === 'strategy'
        ? 'font-weight: 600; font-size: var(--text-base); color: #000'
        : row.type === 'goal'
          ? 'font-weight: 500; font-size: var(--text-sm); color: #888'
          : 'font-weight: 400; font-size: var(--text-sm); color: #ff6600'
      const marginLeft = row.type === 'strategy' ? 0 : row.type === 'goal' ? 16 : 36
      const children: any[] = [
        h('span', { style: nameStyle }, row.name),
      ]
      if (row.description) {
        const iconColor = row.type === 'strategy' ? '#4080ff' : row.type === 'goal' ? '#999' : '#ff6600'
        children.push(
          h(NPopover, { trigger: 'hover', placement: 'top', width: 280 }, {
            trigger: () => h('span', {
              style: `margin-left: 4px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: ${iconColor}; color: #fff; cursor: pointer; opacity: 0.7; transition: opacity 0.15s; font-size: 11px; font-weight: 700; line-height: 1`,
              onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '1' },
              onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '0.7' },
            }, 'i'),
            default: () => h('div', {
              style: 'padding: 4px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #333',
            }, row.description),
          })
        )
      }
      return h('div', { style: `margin-left: ${marginLeft}px; display: inline-flex; align-items: center; gap: 2px` }, children)
    },
  },
  {
    title: 'สถานะ',
    key: 'status',
    width: 160,
    align: 'center',
    render(row) {
      const statusOptions = PLAN_ITEM_STATUS_OPTIONS.map(o => ({ label: o.label, value: o.value }))
      const handleUpdate = (value: PlanItemStatus) => {
        if (row.type === 'strategy') emit('updateStrategyStatus', row.id, { status: value })
        else if (row.type === 'goal') emit('updateGoalStatus', row.id, { status: value })
        else emit('updateIndicatorStatus', row.id, { status: value })
      }
      return h(NSelect, {
        value: row.status,
        options: statusOptions,
        size: 'tiny',
        style: 'min-width: 130px',
        onUpdateValue: handleUpdate,
      })
    },
  },
  {
    title: 'หน่วยนับ',
    key: 'unit',
    width: 90,
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px;)' }, row.unit || '-')
    },
  },
  {
    title: 'เป้าหมาย',
    key: 'targetValue',
    width: 90,
    align: 'right',
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px; font-weight: 500' }, row.targetValue || '-')
    },
  },
  {
    title: 'ค่าปัจจุบัน',
    key: 'currentValue',
    width: 90,
    align: 'right',
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px;' }, row.currentValue || '-')
    },
  },
  {
    title: 'ความก้าวหน้า',
    key: 'progress',
    width: 120,
    render(row) {
      if (row.type !== 'indicator') return null
      const pct = row.progress ?? 0
      return h('div', { style: 'display: flex; align-items: center; gap: 8px; min-width: 100px' }, [
        h(NProgress, {
          type: 'line',
          percentage: pct,
          showInfo: false,
          height: 8,
          railColor: '#e0e0e0',
          color: pct >= 100 ? '#52c41a' : '#1890ff',
          style: 'flex: 1',
        }),
        h('span', { style: 'font-size: 11px; color: var(--color-text-secondary); min-width: 35px' }, `${pct}%`),
      ])
    },
  },
  {
    title: 'ผู้รับผิดชอบ',
    key: 'assignees',
    width: 140,
    render(row) {
      if (row.type !== 'indicator') return null
      const assigneeList = row.assignees
      if (!assigneeList || assigneeList.length === 0) {
        return h('span', { style: 'font-size: 12px; color: var(--color-text-tertiary)' }, '-')
      }
      const names = assigneeList.map((a: any) => a.name || a.displayName || a.email || 'ไม่ทราบ').join(', ')
      return h('span', { style: 'font-size: 12px;', title: names }, names.length > 20 ? names.slice(0, 20) + '…' : names)
    },
  },
  {
    title: '',
    key: 'actions',
    width: 160,
    render(row) {
      const btns: any[] = []
      if (row.type === 'strategy') {
        if (props.planStatus !== 'completed') {
          btns.push(actionBtn(AddOutline, 'เพิ่มเป้าหมาย', () => emit('addGoal', row.id, { name: '', indicatorType: 'amount', weight: 1 })))
        }
        btns.push(actionBtn(CreateOutline, 'แก้ไข', () => openEditStrategyById(row.id)))
        btns.push(actionBtn(TrashOutline, 'ลบ', () => emit('deleteStrategy', row.id), 'error'))
      } else if (row.type === 'goal') {
        if (props.planStatus !== 'completed') {
          btns.push(actionBtn(AddOutline, 'เพิ่มตัวชี้วัด', () => emit('addIndicator', row.id, { name: '', targetValue: '', indicatorType: 'amount', weight: 1 })))
        }
        btns.push(actionBtn(CreateOutline, 'แก้ไข', () => openEditGoalById(row.id)))
        btns.push(actionBtn(TrashOutline, 'ลบ', () => emit('deleteGoal', row.id), 'error'))
      } else {
        btns.push(actionBtn(AddOutline, 'รายงาน', () => emit('addUpdate', row.id)))
        btns.push(actionBtn(StatsChartOutline, 'กราฟ/ประวัติ', () => openIndicatorChart(row.id)))
        btns.push(actionBtn(CreateOutline, 'แก้ไข', () => openEditIndicatorById(row.id)))
        btns.push(actionBtn(TrashOutline, 'ลบ', () => emit('deleteIndicator', row.id), 'error'))
      }
      return h(NSpace, { size: 'small' }, { default: () => btns })
    },
  },
]

// ===== Row props =====
const rowProps = (row: PlanRow) => ({
  style: row.type === 'indicator' ? 'cursor: default' : 'cursor: pointer',
})

// ===== Expand/Collapse =====
const expandedRowKeys = ref<string[]>([])

// ===== Forms =====
const showStrategyForm = ref(false)
const editingStrategy = ref<Strategy | null>(null)
const strategyFormLoading = ref(false)

const showGoalForm = ref(false)
const editingGoal = ref<Goal | null>(null)
const goalFormLoading = ref(false)

const showIndicatorForm = ref(false)
const editingIndicator = ref<Indicator | null>(null)
const indicatorFormLoading = ref(false)

// ===== Drawers =====
const showIndicatorDrawer = ref(false)
const drawerIndicatorId = ref<string>('')
const drawerTab = ref<'assignees' | 'chart' | 'audit'>('assignees')

function openEditStrategyById(strategyId: string) {
  const strategy = props.strategies.find(s => s.id === strategyId)
  if (strategy) {
    editingStrategy.value = strategy
    showStrategyForm.value = true
  }
}

function openEditGoalById(goalId: string) {
  for (const strategy of props.strategies) {
    const goal = strategy.goals?.find(g => g.id === goalId)
    if (goal) {
      editingGoal.value = goal
      showGoalForm.value = true
      return
    }
  }
}

function openEditIndicatorById(indicatorId: string) {
  for (const strategy of props.strategies) {
    for (const goal of strategy.goals || []) {
      const indicator = goal.indicators?.find(i => i.id === indicatorId)
      if (indicator) {
        editingIndicator.value = indicator
        showIndicatorForm.value = true
        return
      }
    }
  }
}

function openIndicatorChart(indicatorId: string) {
  drawerIndicatorId.value = indicatorId
  drawerTab.value = 'chart'
  showIndicatorDrawer.value = true
}

// ===== Save handlers =====
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

async function handleSaveGoal(payload: { name: string; description?: string; sortOrder?: number }) {
  if (!editingGoal.value) return
  goalFormLoading.value = true
  try {
    emit('editGoal', editingGoal.value.id, payload)
    showGoalForm.value = false
  } finally {
    goalFormLoading.value = false
  }
}

async function handleSaveIndicator(payload: { name: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; weight?: number }) {
  if (!editingIndicator.value) return
  indicatorFormLoading.value = true
  try {
    emit('editIndicator', editingIndicator.value.id, payload)
    showIndicatorForm.value = false
  } finally {
    indicatorFormLoading.value = false
  }
}
</script>

<template>
  <div class="strategy-list">
    <div class="strategy-list-header">
      <NButton v-if="planStatus !== 'completed'" type="primary" size="small" @click="showStrategyForm = true">
        <template #icon>
          <NIcon>
            <AddOutline />
          </NIcon>
        </template>
        เพิ่มยุทธศาสตร์
      </NButton>
    </div>

    <NDataTable v-if="treeData.length > 0" :columns="columns" :data="treeData" :row-props="rowProps"
      v-model:expanded-row-keys="expandedRowKeys" :loading="loading" :bordered="false" striped />
    <div v-else class="empty-state">
      <p>ยังไม่มียุทธศาสตร์ในแผนนี้</p>
      <NButton size="small" @click="showStrategyForm = true">เพิ่มยุทธศาสตร์แรก</NButton>
    </div>
  </div>

  <StrategyForm v-model:show="showStrategyForm" :strategy="editingStrategy" :loading="strategyFormLoading"
    @save="handleSaveStrategy" />
  <GoalForm v-model:show="showGoalForm" :goal="editingGoal" :loading="goalFormLoading" @save="handleSaveGoal" />
  <IndicatorForm v-model:show="showIndicatorForm" :indicator="editingIndicator" :loading="indicatorFormLoading"
    @save="handleSaveIndicator" />

  <NDrawer v-model:show="showIndicatorDrawer" :width="600" placement="right">
    <NDrawerContent :title="'รายละเอียดตัวชี้วัด'">
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.strategy-list-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-md);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}
</style>

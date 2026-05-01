<script setup lang="ts">
import { ref, computed, h } from 'vue'
import {
  NDataTable, NButton, NIcon, NProgress, NDrawer, NDrawerContent, NSpace, NPopover, NDropdown, NCard, NTabs, NTabPane, NGrid, NGi
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  AddOutline, CreateOutline, TrashOutline, StatsChartOutline, EllipsisHorizontal
} from '@vicons/ionicons5'
import type { Strategy, Goal, Indicator, PlanProgress, IndicatorProgress, PlanItemStatus } from '@/types/plan'
import StrategyForm from './StrategyForm.vue'
import GoalForm from '@/components/plan/goal/GoalForm.vue'
import IndicatorForm from '@/components/plan/indicator/IndicatorForm.vue'
import IndicatorUpdateForm from '@/components/plan/indicator/IndicatorUpdateForm.vue'
import IndicatorAssignees from '@/components/plan/indicator/IndicatorAssignees.vue'
import IndicatorChart from '@/components/plan/indicator/IndicatorChart.vue'
import IndicatorAuditLog from '@/components/plan/indicator/IndicatorAuditLog.vue'
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
        children.push(
          h(NPopover, { trigger: 'hover', placement: 'top', width: 280 }, {
            trigger: () => h('span', {
              style: `margin-left: 4px; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; opacity: 0.6; transition: opacity 0.15s; background: #e8e8e8; border: 1px solid #4080ff; border-radius: 3px;`,
              onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '1' },
              onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '0.6' },
            }, h('span', {
              style: 'color: #4080ff; font-size: 10px; font-weight: 600; font-style: italic; line-height: 1;'
            }, 'i')),
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
    align: 'left',
    render(row) {
      const statusOption = PLAN_ITEM_STATUS_OPTIONS.find(o => o.value === row.status)
      const bgColor = statusOption ? `${statusOption.color}20` : '#f1f5f9'
      const textColor = statusOption?.color || '#64748b'
      const borderColor = statusOption?.color || '#e2e8f0'
      const label = statusOption?.label || row.status

      const statusOptions = PLAN_ITEM_STATUS_OPTIONS.map(o => ({ label: o.label, value: o.value, color: o.color }))
      const handleUpdate = (value: PlanItemStatus) => {
        if (row.type === 'strategy') emit('updateStrategyStatus', row.id, { status: value })
        else if (row.type === 'goal') emit('updateGoalStatus', row.id, { status: value })
        else emit('updateIndicatorStatus', row.id, { status: value })
      }

      return h(NPopover, { trigger: 'hover', placement: 'top' }, {
        trigger: () => h('span', {
          style: `display: inline-flex; padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; white-space: nowrap; cursor: pointer; background: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor}; transition: opacity 0.15s;`,
          onMouseenter: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '0.8' },
          onMouseleave: (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.opacity = '1' },
        }, label),
        default: () => h('div', { style: 'padding: 4px 0' }, [
          h('div', { style: 'font-size: 12px; font-weight: 500; color: #333; margin-bottom: 6px; padding: 0 8px' }, 'เปลี่ยนสถานะ'),
          ...statusOptions.map(opt => {
            const isActive = opt.value === row.status
            return h('div', {
              style: `padding: 6px 8px; cursor: pointer; border-radius: 4px; display: flex; gap: 8px; background: ${isActive ? `${opt.color}10` : 'transparent'}; color: ${opt.color};`,
              onClick: () => handleUpdate(opt.value),
            }, [
              h('span', {
                style: `width: 8px; height: 8px; border-radius: 50%; background: ${opt.color}; ${isActive ? '' : 'opacity: 0.5'}`,
              }),
              opt.label,
            ])
          }),
        ]),
      })
    },
  },
  {
    title: 'หน่วยนับ',
    key: 'unit',
    width: 90,
    align: 'center',
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px; text-align: center; display: block;' }, row.unit || '-')
    },
  },
  {
    title: 'เป้าหมาย',
    key: 'targetValue',
    width: 90,
    align: 'center',
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px; font-weight: 500; text-align: center; display: block;' }, row.targetValue || '-')
    },
  },
  {
    title: 'ค่าปัจจุบัน',
    key: 'currentValue',
    width: 90,
    align: 'center',
    render(row) {
      if (row.type !== 'indicator') return null
      return h('span', { style: 'font-size: 12px; text-align: center; display: block;' }, row.currentValue || '-')
    },
  },
  {
    title: 'ความก้าวหน้า',
    key: 'progress',
    width: 120,
    render(row) {
      if (row.type !== 'indicator') return null
      const pct = row.progress ?? 0
      return h('div', { style: 'position: relative; width: 100%' }, [
        h(NProgress, {
          type: 'line',
          percentage: pct,
          showIndicator: false,
          height: 20,
          railColor: '#e0e0e0',
          color: pct >= 100 ? '#52c41a' : '#1890ff',
          borderRadius: 4,
          style: 'width: 100%',
        }),
        h('span', {
          style: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; color: ${pct >= 100 ? '#fff' : '#fff'}; font-weight: 500; pointer-events: none;`,
        }, `${pct}%`),
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
    title: 'ดำเนินการ',
    key: 'actions',
    width: 120,
    render(row) {
      if (row.type === 'strategy') {
        const menuOptions: any[] = []
        if (props.planStatus !== 'completed') {
          menuOptions.push({
            label: 'เพิ่มเป้าหมาย',
            key: 'add-goal',
            icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
          })
        }
        menuOptions.push({
          label: 'แก้ไข',
          key: 'edit-strategy',
          icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
        })
        menuOptions.push({
          label: 'ลบ',
          key: 'delete-strategy',
          icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
          props: { style: 'color: #d03050' },
        })
        const dropdownBtns: any[] = [
          h(NDropdown, {
            trigger: 'click',
            options: menuOptions,
            onSelect: (key: string) => {
              if (key === 'add-goal') { addingGoalForStrategyId.value = row.id; editingGoal.value = null; showGoalForm.value = true }
              else if (key === 'edit-strategy') openEditStrategyById(row.id)
              else if (key === 'delete-strategy') emit('deleteStrategy', row.id)
            },
          }, {
            default: () => h(NButton, { size: 'tiny', tertiary: true, title: 'ดำเนินการ', class: 'dropdown-trigger', style: 'cursor: pointer' }, {
              icon: () => h(NIcon, { size: 14 }, () => h(EllipsisHorizontal)),
            }),
          })
        ]
        return h('div', { class: 'action-cell', style: 'display: contents;' }, h(NSpace, { size: 'small' }, { default: () => dropdownBtns }))
      } else if (row.type === 'goal') {
        const menuOptions: any[] = []
        if (props.planStatus !== 'completed') {
          menuOptions.push({
            label: 'เพิ่มตัวชี้วัด',
            key: 'add-indicator',
            icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
          })
        }
        menuOptions.push({
          label: 'แก้ไข',
          key: 'edit-goal',
          icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
        })
        menuOptions.push({
          label: 'ลบ',
          key: 'delete-goal',
          icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
          props: { style: 'color: #d03050' },
        })
        const dropdownBtns: any[] = [
          h(NDropdown, {
            trigger: 'click',
            options: menuOptions,
            onSelect: (key: string) => {
              if (key === 'add-indicator') emit('addIndicator', row.id, { name: '', targetValue: '', indicatorType: 'amount', weight: 1 })
              else if (key === 'edit-goal') openEditGoalById(row.id)
              else if (key === 'delete-goal') emit('deleteGoal', row.id)
            },
          }, {
            default: () => h(NButton, { size: 'tiny', tertiary: true, title: 'ดำเนินการ', class: 'dropdown-trigger', style: 'cursor: pointer' }, {
              icon: () => h(NIcon, { size: 14 }, () => h(EllipsisHorizontal)),
            }),
          })
        ]
        return h('div', { class: 'action-cell', style: 'display: contents;' }, h(NSpace, { size: 'small' }, { default: () => dropdownBtns }))
      } else {
        const menuOptions: any[] = [
          {
            label: 'แก้ไข',
            key: 'edit-indicator',
            icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
          },
          {
            label: 'ลบ',
            key: 'delete-indicator',
            icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
            props: { style: 'color: #d03050' },
          },
        ]
        const dropdownBtns: any[] = [
          actionBtn(AddOutline, 'รายงาน', () => emit('addUpdate', row.id)),
          actionBtn(StatsChartOutline, 'กราฟ/ประวัติ', () => openIndicatorChart(row.id)),
          h(NDropdown, {
            trigger: 'click',
            options: menuOptions,
            onSelect: (key: string) => {
              if (key === 'edit-indicator') openEditIndicatorById(row.id)
              else if (key === 'delete-indicator') emit('deleteIndicator', row.id)
            },
          }, {
            default: () => h(NButton, { size: 'tiny', tertiary: true, title: 'ดำเนินการ', class: 'dropdown-trigger', style: 'cursor: pointer' }, {
              icon: () => h(NIcon, { size: 14 }, () => h(EllipsisHorizontal)),
            }),
          })
        ]
        return h('div', { class: 'action-cell', style: 'display: contents;' }, h(NSpace, { size: 'small' }, { default: () => dropdownBtns }))
      }
    },
  },
]

// ===== Row props =====
const rowProps = (row: PlanRow) => ({
  style: row.type === 'indicator' ? 'cursor: default' : 'cursor: pointer',
})

const rowClassName = (row: PlanRow) => {
  if (row.type === 'strategy') return 'row-strategy'
  if (row.type === 'goal') return 'row-goal'
  return 'row-indicator'
}

// ===== Expand/Collapse =====
const expandedRowKeys = ref<string[]>([])

// ===== Forms =====
const showStrategyForm = ref(false)
const editingStrategy = ref<Strategy | null>(null)
const strategyFormLoading = ref(false)

const showGoalForm = ref(false)
const editingGoal = ref<Goal | null>(null)
const goalFormLoading = ref(false)
const addingGoalForStrategyId = ref<string | null>(null)

const showIndicatorForm = ref(false)
const editingIndicator = ref<Indicator | null>(null)
const indicatorFormLoading = ref(false)

// ===== Drawers =====
const showIndicatorDrawer = ref(false)
const drawerIndicatorId = ref<string>('')
const drawerTab = ref<'assignees' | 'chart' | 'audit'>('assignees')

const drawerIndicator = computed(() => {
  if (!drawerIndicatorId.value) return null
  for (const strategy of props.strategies) {
    for (const goal of strategy.goals || []) {
      const indicator = goal.indicators?.find(i => i.id === drawerIndicatorId.value)
      if (indicator) return indicator
    }
  }
  return null
})

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
  goalFormLoading.value = true
  try {
    if (editingGoal.value) {
      emit('editGoal', editingGoal.value.id, payload)
    } else if (addingGoalForStrategyId.value) {
      emit('addGoal', addingGoalForStrategyId.value, payload)
    }
    showGoalForm.value = false
  } finally {
    goalFormLoading.value = false
    addingGoalForStrategyId.value = null
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
      v-model:expanded-row-keys="expandedRowKeys" :loading="loading" :bordered="false" striped class="strategy-table"
      :row-class-name="rowClassName" />
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
    <NDrawerContent :title="'รายละเอียดตัวชี้วัด'" closable>
      <template v-if="drawerIndicatorId">
        <NTabs v-model:value="drawerTab" type="line" animated style="margin-top: 12px">
          <NTabPane name="assignees" tab="ผู้รับผิดชอบ">
            <IndicatorAssignees :assignees="drawerIndicator?.assignees || []" :editable="false" />
          </NTabPane>
          <NTabPane name="chart" tab="กราฟแนวโน้ม">
            <IndicatorChart
              v-if="drawerIndicator"
              :indicator-id="drawerIndicatorId"
              :target-value="drawerIndicator.targetValue || ''"
              :unit="drawerIndicator.unit"
            />
            <NText v-else depth="3">ไม่พบข้อมูลตัวชี้วัด</NText>
          </NTabPane>
          <NTabPane name="audit" tab="ประวัติการเปลี่ยนแปลง">
            <IndicatorAuditLog :indicator-id="drawerIndicatorId" :is-admin="false" />
          </NTabPane>
        </NTabs>
      </template>
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

:deep(.strategy-table .n-data-table-td) {
  border-bottom: 1px solid #e2e8f0 !important;
  border-right: 1px solid #e2e8f0 !important;
}

:deep(.strategy-table .n-data-table-th) {
  border-bottom: 1px solid #e2e8f0 !important;
  border-right: 1px solid #e2e8f0 !important;
}

/* Row Grouping — hierarchy background colors */
:deep(.strategy-table .n-data-table-tr.row-strategy) {
  background-color: #f1f5f9;
}

:deep(.strategy-table .n-data-table-tr.row-strategy .n-data-table-td:first-child) {
  border-left: 3px solid #94a3b8;
}

:deep(.strategy-table .n-data-table-tr.row-goal) {
  background-color: #f8fafc;
}

:deep(.strategy-table .n-data-table-tr.row-goal .n-data-table-td:first-child) {
  border-left: 3px solid #cbd5e1;
}

/* Action-on-hover: show dropdown trigger on row hover */
:deep(.strategy-table .n-data-table-tr:hover .action-cell .dropdown-trigger) {
  opacity: 1 !important;
}
</style>

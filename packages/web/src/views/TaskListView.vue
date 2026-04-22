<script setup lang="ts">
import { ref, computed, h, onMounted, watch } from 'vue'
import {
  NCard,
  NDataTable,
  NButton,
  NButtonGroup,
  NIcon,
  NSelect,
  NInput,
  NSpin,
  NPagination,
  NTag,
  NAvatar,
  useMessage,
} from 'naive-ui'
import {
  AddCircleOutline,
  FilterOutline,
  GridOutline,
  ListOutline,
  CalendarOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import ThaiDatePicker from '@/components/common/ThaiDatePicker.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import SubtaskExpandRow from '@/components/task/SubtaskExpandRow.vue'
import { useTaskStore } from '@/stores/task'
import { useWorkspaceStore } from '@/stores/workspace'
import { workspaceService } from '@/services/workspace'
import { projectService } from '@/services/project'
import { getFiscalYear } from '@/utils/thai'
import type { Workspace, WorkspaceStatus } from '@/types'

const router = useRouter()
const message = useMessage()
const taskStore = useTaskStore()
const wsStore = useWorkspaceStore()

const currentFY = getFiscalYear()
const activeTab = ref('list')
const tasks = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const showTaskForm = ref(false)
const editingTaskId = ref<string | undefined>(undefined)
const showDetail = ref(false)
const detailTaskId = ref<string | null>(null)
const expandedRowKeys = ref<string[]>([])

// Filter state
const workspaceFilter = ref<string | null>(wsStore.currentWorkspaceId)
const projectFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)
const priorityFilter = ref<string | null>(null)
const searchFilter = ref('')
const fiscalYearFilter = ref<number | null>(currentFY)
const startDateFromFilter = ref<number | null>(null)
const startDateToFilter = ref<number | null>(null)
const dueDateFromFilter = ref<number | null>(null)
const dueDateToFilter = ref<number | null>(null)

// Dropdown options
const workspaces = ref<Workspace[]>([])
const projectOptions = ref<{ label: string; value: string }[]>([])
const statusOptions = ref<{ label: string; value: string }[]>([])

const workspaceOptions = computed(() =>
  workspaces.value.map(w => ({
    label: w.name,
    value: w.id,
  }))
)

const priorityOptions = [
  { label: 'ทุกระดับ', value: '' },
  { label: 'เร่งด่วน', value: 'urgent' },
  { label: 'สูง', value: 'high' },
  { label: 'ปกติ', value: 'normal' },
  { label: 'ต่ำ', value: 'low' },
]

const fyOptions = computed(() => {
  const opts = [{ label: 'ทุกปีงบ', value: 0 }]
  for (let fy = currentFY + 1; fy >= currentFY - 3; fy--) {
    opts.push({ label: `ปีงบ ${fy}`, value: fy })
  }
  return opts
})

function formatDateParam(ts: number | null): string | undefined {
  if (!ts) return undefined
  const d = new Date(ts)
  return d.toISOString().split('T')[0]
}

async function fetchTasks() {
  try {
    await taskStore.fetchTasks({
      workspaceId: workspaceFilter.value || undefined,
      projectId: projectFilter.value || undefined,
      status: statusFilter.value || undefined,
      priority: priorityFilter.value || undefined,
      search: searchFilter.value || undefined,
      fiscalYear: fiscalYearFilter.value || undefined,
      startDateFrom: formatDateParam(startDateFromFilter.value),
      startDateTo: formatDateParam(startDateToFilter.value),
      dueDateFrom: formatDateParam(dueDateFromFilter.value),
      dueDateTo: formatDateParam(dueDateToFilter.value),
      page: page.value,
      pageSize: pageSize.value,
    })
    tasks.value = taskStore.tasks
    total.value = taskStore.total
  } catch {
    message.error('โหลดรายการงานไม่สำเร็จ')
  }
}

async function loadWorkspaces() {
  try {
    workspaces.value = await workspaceService.list()
  } catch { /* ignore */ }
}

async function loadProjects(workspaceId?: string) {
  try {
    const projects = await projectService.list(workspaceId ? { workspaceId } : undefined)
    projectOptions.value = projects.map(p => ({ label: p.name, value: p.id }))
  } catch {
    projectOptions.value = []
  }
}

async function loadAllStatuses() {
  if (!workspaces.value.length) return
  try {
    const all = await Promise.all(workspaces.value.map(w => workspaceService.getStatuses(w.id)))
    const seen = new Map<string, { label: string; value: string }>()
    all.flat().forEach(s => {
      if (!seen.has(s.name)) seen.set(s.name, { label: s.name, value: s.id })
    })
    statusOptions.value = Array.from(seen.values())
  } catch {
    statusOptions.value = []
  }
}

async function loadStatusesForWorkspace(workspaceId: string) {
  try {
    const statuses: WorkspaceStatus[] = await workspaceService.getStatuses(workspaceId)
    statusOptions.value = statuses.map(s => ({ label: s.name, value: s.id }))
  } catch {
    statusOptions.value = []
  }
}

function handleWorkspaceChange(val: string | null) {
  workspaceFilter.value = val
  projectFilter.value = null
  statusFilter.value = null
  if (val) {
    loadProjects(val)
    loadStatusesForWorkspace(val)
  } else {
    loadProjects()
    loadAllStatuses()
  }
}

const columns = [
  {
    type: 'expand' as const,
    expandable: (row: any) => (row.subtaskCount || 0) > 0,
    renderExpand: (row: any) =>
      h(SubtaskExpandRow, { taskId: row.id, workspaceId: row.workspaceId }),
  },
  {
    title: 'งาน',
    key: 'title',
    render(row: any) {
      return h('div', { style: 'min-width: 200px' }, [
        h('div', { style: 'font-weight: 500' }, row.title),
      ])
    },
  },
  {
    title: 'งานย่อย',
    key: 'subtasks',
    width: 90,
    render(row: any) {
      const total: number = row.subtaskCount || 0
      if (!total) return h('span', { style: 'color: var(--color-text-tertiary); font-size: 0.8rem' }, '—')
      const done: number = row.completedSubtaskCount || 0
      const allDone = done === total
      return h(
        'div',
        {
          class: ['subtask-badge', allDone ? 'subtask-badge--done' : done > 0 ? 'subtask-badge--partial' : 'subtask-badge--none'],
        },
        `${done}/${total}`,
      )
    },
  },
  {
    title: 'ความสำคัญ',
    key: 'priority',
    width: 110,
    render(row: any) {
      return h(PriorityBadge, { priority: row.priority })
    },
  },
  {
    title: 'พื้นที่งาน',
    key: 'workspaceName',
    width: 150,
    render(row: any) {
      return h(NTag, { size: 'small', bordered: false, type: 'info' }, { default: () => row.workspaceName || '—' })
    },
  },
  {
    title: 'สถานะ',
    key: 'status',
    width: 140,
    render(row: any) {
      return h(StatusBadge, { name: row.statusName || '—', color: row.statusColor })
    },
  },
  {
    title: 'โครงการ',
    key: 'projectName',
    width: 150,
    render(row: any) {
      return row.projectName || '—'
    },
  },
  {
    title: 'วันเริ่มต้น',
    key: 'startDate',
    width: 130,
    render(row: any) {
      if (!row.startDate) return '—'
      return h(ThaiDate, { date: row.startDate, format: 'short' })
    },
  },
  {
    title: 'กำหนดส่ง',
    key: 'dueDate',
    width: 130,
    render(row: any) {
      if (!row.dueDate) return '—'
      return h(ThaiDate, { date: row.dueDate, format: 'short' })
    },
  },
  {
    title: 'ผู้รับผิดชอบ',
    key: 'assignees',
    width: 120,
    render(row: any) {
      if (!row.assignees?.length) return '—'
      const colors = ['#e8f5e9', '#e3f2fd', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa']
      const textColors = ['#2e7d32', '#1565c0', '#e65100', '#c62828', '#6a1b9a', '#00695c']
      const avatars = row.assignees.map((a: any, i: number) => {
        const name = a.name || '??'
        const initials = name.length >= 2 ? name.slice(0, 2) : name
        const ci = i % colors.length
        return h(NAvatar, {
          size: 28,
          round: true,
          color: colors[ci],
          style: i > 0
            ? `margin-left: -8px; font-size: 12px; font-weight: 600; color: ${textColors[ci]}; border: 2px solid #fff`
            : `font-size: 12px; font-weight: 600; color: ${textColors[ci]}; border: 2px solid #fff`,
        }, { default: () => initials })
      })
      return h('div', { style: 'display: flex; align-items: center' }, avatars)
    },
  },
]

function handleTabChange(tab: string) {
  if (tab === 'board') router.push('/tasks/board')
  if (tab === 'calendar') router.push('/tasks/calendar')
}

function openCreateForm() {
  editingTaskId.value = undefined
  showTaskForm.value = true
}

function openDetail(taskId: string) {
  detailTaskId.value = taskId
  showDetail.value = true
}

function resetFilters() {
  workspaceFilter.value = null
  projectFilter.value = null
  statusFilter.value = null
  priorityFilter.value = null
  searchFilter.value = ''
  fiscalYearFilter.value = currentFY
  startDateFromFilter.value = null
  startDateToFilter.value = null
  dueDateFromFilter.value = null
  dueDateToFilter.value = null
  loadProjects()
  loadAllStatuses()
}

watch(() => wsStore.currentWorkspaceId, (id) => {
  workspaceFilter.value = id
  projectFilter.value = null
  statusFilter.value = null
  if (id) {
    loadProjects(id)
    loadStatusesForWorkspace(id)
  } else {
    loadProjects()
    loadAllStatuses()
  }
})

watch([workspaceFilter, projectFilter, statusFilter, priorityFilter, fiscalYearFilter, page], fetchTasks, { deep: true })
watch([startDateFromFilter, startDateToFilter, dueDateFromFilter, dueDateToFilter], fetchTasks, { deep: true })

onMounted(async () => {
  if (!wsStore.workspaces.length) await wsStore.fetchWorkspaces()
  workspaces.value = wsStore.workspaces
  const wsId = wsStore.currentWorkspaceId
  if (wsId) {
    await Promise.all([loadProjects(wsId), loadStatusesForWorkspace(wsId), fetchTasks()])
  } else {
    await Promise.all([loadProjects(), loadAllStatuses(), fetchTasks()])
  }
})
</script>

<template>
  <NSpin :show="taskStore.loading">
    <div class="task-list-page">
      <PageHeader title="รายการงาน" :subtitle="`${total} งาน`">
        <template #actions>
          <NButtonGroup>
            <NButton size="small" :type="activeTab === 'list' ? 'primary' : 'default'" @click="activeTab = 'list'">
              <template #icon>
                <NIcon :size="15">
                  <ListOutline />
                </NIcon>
              </template>
              รายการ
            </NButton>
            <NButton size="small" :type="activeTab === 'board' ? 'primary' : 'default'"
              @click="handleTabChange('board')">
              <template #icon>
                <NIcon :size="15">
                  <GridOutline />
                </NIcon>
              </template>
              กระดาน
            </NButton>
            <NButton size="small" :type="activeTab === 'calendar' ? 'primary' : 'default'"
              @click="handleTabChange('calendar')">
              <template #icon>
                <NIcon :size="15">
                  <CalendarOutline />
                </NIcon>
              </template>
              ปฏิทิน
            </NButton>
          </NButtonGroup>
          <NButton type="primary" @click="openCreateForm">
            <template #icon>
              <NIcon>
                <AddCircleOutline />
              </NIcon>
            </template>
            สร้างงานใหม่
          </NButton>
        </template>
      </PageHeader>

      <!-- Filters -->
      <NCard class="filter-card" :bordered="false">
        <div class="filter-header">
          <div class="filter-title">
            <NIcon :size="15">
              <FilterOutline />
            </NIcon>
            ตัวกรอง
          </div>
          <NButton size="small" secondary @click="resetFilters">
            <template #icon>
              <NIcon>
                <RefreshOutline />
              </NIcon>
            </template>
            ล้างตัวกรอง
          </NButton>
        </div>

        <div class="filter-dropdowns">
          <NInput v-model:value="searchFilter" placeholder="ค้นหางาน..." size="small" class="filter-search" clearable
            @keyup.enter="fetchTasks" />
          <NSelect v-model:value="fiscalYearFilter" :options="fyOptions" placeholder="ปีงบประมาณ" size="small"
            class="filter-fy" clearable />
          <NSelect v-model:value="workspaceFilter" :options="workspaceOptions" placeholder="พื้นที่งาน" size="small"
            class="filter-select" clearable @update:value="handleWorkspaceChange" />
          <NSelect v-model:value="projectFilter" :options="projectOptions" placeholder="โครงการ" size="small"
            class="filter-select" clearable />
          <NSelect v-model:value="statusFilter" :options="statusOptions" placeholder="สถานะ" size="small"
            class="filter-select" clearable />
          <NSelect v-model:value="priorityFilter" :options="priorityOptions" placeholder="ความสำคัญ" size="small"
            class="filter-select" clearable />
        </div>

        <div class="filter-dates">
          <div class="date-range-group">
            <span class="date-label">วันเริ่มต้น</span>
            <div class="filter-date">
              <ThaiDatePicker v-model:value="startDateFromFilter" placeholder="จาก" />
            </div>
            <span class="date-sep">—</span>
            <div class="filter-date">
              <ThaiDatePicker v-model:value="startDateToFilter" placeholder="ถึง" />
            </div>
          </div>
          <div class="date-range-divider" />
          <div class="date-range-group">
            <span class="date-label">กำหนดส่ง</span>
            <div class="filter-date">
              <ThaiDatePicker v-model:value="dueDateFromFilter" placeholder="จาก" />
            </div>
            <span class="date-sep">—</span>
            <div class="filter-date">
              <ThaiDatePicker v-model:value="dueDateToFilter" placeholder="ถึง" />
            </div>
          </div>
        </div>
      </NCard>

      <!-- Task Table -->
      <NCard class="table-card" :bordered="false">
        <NDataTable :columns="columns" :data="tasks" :bordered="false" :single-line="false"
          :row-key="(row: any) => row.id" v-model:expanded-row-keys="expandedRowKeys" :row-props="(row: any) => ({
            style: 'cursor: pointer',
            onClick: (e: MouseEvent) => {
              const target = e.target as HTMLElement
              if (target.closest('.n-data-table-expand-trigger')) return
              openDetail(row.id)
            },
          })" :scroll-x="1100" size="small" />
      </NCard>

      <div class="task-pagination">
        <NPagination v-model:page="page" v-model:page-size="pageSize" :item-count="total" :page-sizes="[10, 20, 50]" />
      </div>
    </div>
  </NSpin>

  <TaskForm v-model:show="showTaskForm" :task-id="editingTaskId" @created="fetchTasks" @updated="fetchTasks" />

  <TaskDetail v-model:show="showDetail" :task-id="detailTaskId"
    @edit="(id) => { editingTaskId = id; showTaskForm = true }" @deleted="fetchTasks" />
</template>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.filter-dropdowns {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-search {
  flex: 1;
  min-width: 160px;
  max-width: 240px;
}

.filter-fy {
  width: 140px;
  flex-shrink: 0;
}

.filter-select {
  width: 148px;
  flex-shrink: 0;
}

.filter-dates {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.date-range-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

.date-sep {
  color: var(--color-text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
}

.date-range-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 4px;
  flex-shrink: 0;
}

.filter-date {
  width: 160px;
  flex-shrink: 0;
}

.table-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

:deep(.subtask-badge) {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.6;
}

:deep(.subtask-badge--none) {
  background: var(--color-surface-variant, #f0f0f0);
  color: var(--color-text-secondary);
}

:deep(.subtask-badge--partial) {
  background: #fff7e6;
  color: #d46b08;
}

:deep(.subtask-badge--done) {
  background: #f0faf0;
  color: #389e0d;
}

.task-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

@media (max-width: 767px) {

  .filter-search,
  .filter-fy,
  .filter-select,
  .filter-date {
    width: 100%;
    max-width: 100%;
    flex: 1 1 100%;
  }

  .date-range-group {
    flex-wrap: wrap;
  }

  .date-range-divider {
    display: none;
  }
}
</style>

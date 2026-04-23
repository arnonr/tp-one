<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted, watch } from 'vue'
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
  NDropdown,
  useMessage,
} from 'naive-ui'
import {
  AddCircleOutline,
  GridOutline,
  ListOutline,
  CalendarOutline,
  RefreshOutline,
  FunnelOutline,
  ChevronDownOutline,
  ChevronUpOutline,
} from '@vicons/ionicons5'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import ThaiDatePicker from '@/components/common/ThaiDatePicker.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import SubtaskExpandRow from '@/components/task/SubtaskExpandRow.vue'
import ProjectTaskBoard from '@/components/project/ProjectTaskBoard.vue'
import ProjectTaskCalendar from '@/components/project/ProjectTaskCalendar.vue'
import { useTaskStore } from '@/stores/task'
import { workspaceService } from '@/services/workspace'
import { getFiscalYear } from '@/utils/thai'

const props = defineProps<{
  projectId: string
}>()

const message = useMessage()
const taskStore = useTaskStore()

const currentFY = getFiscalYear()
const activeTab = ref('list')
const isMobile = ref(window.innerWidth < 768)

// Task list state
const tasks = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Form state
const showTaskForm = ref(false)
const editingTaskId = ref<string | undefined>(undefined)
const showDetail = ref(false)
const detailTaskId = ref<string | null>(null)
const expandedRowKeys = ref<string[]>([])

// Sort state
const sortBy = ref<string | null>('startDate')
const sortOrder = ref<'asc' | 'desc' | 'ascend' | 'descend' | false>('desc')

// Advanced filter toggle
const showAdvancedFilters = ref(false)

// Filter state
const statusFilter = ref<string | null>(null)
const priorityFilter = ref<string | null>(null)
const searchFilter = ref('')
const fiscalYearFilter = ref<number | null>(currentFY)
const startDateFromFilter = ref<number | null>(null)
const startDateToFilter = ref<number | null>(null)
const dueDateFromFilter = ref<number | null>(null)
const dueDateToFilter = ref<number | null>(null)

// Dropdown options
const statusOptions = ref<{ label: string; value: string }[]>([])

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
      projectId: props.projectId,
      status: statusFilter.value || undefined,
      priority: priorityFilter.value || undefined,
      search: searchFilter.value || undefined,
      fiscalYear: fiscalYearFilter.value || undefined,
      startDateFrom: formatDateParam(startDateFromFilter.value),
      startDateTo: formatDateParam(startDateToFilter.value),
      dueDateFrom: formatDateParam(dueDateFromFilter.value),
      dueDateTo: formatDateParam(dueDateToFilter.value),
      sortBy: sortBy.value || undefined,
      sortOrder: sortOrder.value === 'ascend' ? 'asc' : sortOrder.value === 'descend' ? 'desc' : undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    tasks.value = taskStore.tasks
    total.value = taskStore.total
  } catch {
    message.error('โหลดรายการงานไม่สำเร็จ')
  }
}

async function loadStatusesForWorkspace() {
  // Get workspaceId from the first task's workspaceId or use project context
  if (!taskStore.workspaceStatuses || Object.keys(taskStore.workspaceStatuses).length === 0) {
    // Fetch statuses for all workspaces since we don't have a specific one
    await taskStore.fetchAllStatuses()
    const allStatuses = taskStore.statuses
    statusOptions.value = allStatuses.map((s: any) => ({ label: s.name, value: s.id }))
    return
  }
  // Use first available workspace's statuses
  const firstWsId = Object.keys(taskStore.workspaceStatuses)[0]
  const statuses = taskStore.workspaceStatuses[firstWsId]
  statusOptions.value = statuses.map((s: any) => ({ label: s.name, value: s.id }))
}

function toggleExpand(rowId: string) {
  const idx = expandedRowKeys.value.indexOf(rowId)
  if (idx === -1) {
    expandedRowKeys.value.push(rowId)
  } else {
    expandedRowKeys.value.splice(idx, 1)
  }
}

async function handleStatusChange(taskId: string, statusId: string, workspaceId: string) {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return
  const prev = { statusId: task.statusId, statusName: task.statusName, statusColor: task.statusColor }
  const wsStatuses = taskStore.workspaceStatuses[workspaceId] || []
  const newStatus = wsStatuses.find((s: any) => s.id === statusId)
  if (newStatus) {
    task.statusId = statusId
    task.statusName = newStatus.name
    task.statusColor = newStatus.color
  }
  try {
    await taskStore.updateTask(taskId, { statusId })
    message.success('เปลี่ยนสถานะสำเร็จ')
  } catch {
    Object.assign(task, prev)
    message.error('เปลี่ยนสถานะไม่สำเร็จ')
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
    sorter: true,
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
          style: 'cursor: pointer',
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            toggleExpand(row.id)
          },
        },
        `${done}/${total}`,
      )
    },
  },
  {
    title: 'ความสำคัญ',
    key: 'priority',
    width: 110,
    sorter: true,
    render(row: any) {
      return h(PriorityBadge, { priority: row.priority })
    },
  },
  {
    title: 'สถานะ',
    key: 'status',
    width: 140,
    sorter: true,
    render(row: any) {
      const wsStatuses = taskStore.workspaceStatuses[row.workspaceId] || []
      const options = wsStatuses.map((s: any) => ({ key: s.id, label: s.name }))
      if (!options.length) {
        return h(StatusBadge, { name: row.statusName || '—', color: row.statusColor })
      }
      return h('div', { onClick: (e: MouseEvent) => e.stopPropagation() }, [
        h(NDropdown, {
          options,
          trigger: 'click',
          onSelect: (key: string) => handleStatusChange(row.id, key, row.workspaceId),
        }, {
          default: () => h('div', { style: 'cursor: pointer; display: inline-flex' }, [
            h(StatusBadge, { name: row.statusName || '—', color: row.statusColor }),
          ]),
        }),
      ])
    },
  },
  {
    title: 'วันเริ่มต้น',
    key: 'startDate',
    width: 130,
    sorter: true,
    render(row: any) {
      if (!row.startDate) return '—'
      return h(ThaiDate, { date: row.startDate, format: 'short' })
    },
  },
  {
    title: 'กำหนดส่ง',
    key: 'dueDate',
    width: 130,
    sorter: true,
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
  activeTab.value = tab
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
  statusFilter.value = null
  priorityFilter.value = null
  searchFilter.value = ''
  fiscalYearFilter.value = currentFY
  startDateFromFilter.value = null
  startDateToFilter.value = null
  dueDateFromFilter.value = null
  dueDateToFilter.value = null
}

function getInitials(name: string, index: number) {
  const initials = name.length >= 2 ? name.slice(0, 2) : name
  const colors = ['#e8f5e9', '#e3f2fd', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa']
  const textColors = ['#2e7d32', '#1565c0', '#e65100', '#c62828', '#6a1b9a', '#00695c']
  const ci = index % colors.length
  return { initials, bg: colors[ci], color: textColors[ci] }
}

function onResize() {
  isMobile.value = window.innerWidth < 768
}

function handleSorterChange(sorter: any) {
  if (!sorter) {
    sortBy.value = null
    sortOrder.value = false
  } else if (sorter.order === false) {
    sortBy.value = sorter.columnKey
    sortOrder.value = 'ascend'
  } else {
    sortBy.value = sorter.columnKey
    sortOrder.value = sorter.order
  }
  page.value = 1
  fetchTasks()
}

const activeAdvancedCount = computed(() => {
  let count = 0
  if (priorityFilter.value) count++
  if (startDateFromFilter.value || startDateToFilter.value) count++
  if (dueDateFromFilter.value || dueDateToFilter.value) count++
  return count
})

watch([statusFilter, priorityFilter, fiscalYearFilter, page], fetchTasks, { deep: true })
watch([startDateFromFilter, startDateToFilter, dueDateFromFilter, dueDateToFilter], fetchTasks, { deep: true })

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await taskStore.fetchAllStatuses()
  await loadStatusesForWorkspace()
  await fetchTasks()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <NSpin :show="taskStore.loading">
    <div class="project-task-tab">
      <!-- Tab Header with View Switcher -->
      <div class="tab-header">
        <NButtonGroup size="small">
          <NButton :type="activeTab === 'list' ? 'primary' : 'default'" @click="activeTab = 'list'">
            <template #icon>
              <NIcon :size="15"><ListOutline /></NIcon>
            </template>
            รายการ
          </NButton>
          <NButton :type="activeTab === 'board' ? 'primary' : 'default'" @click="handleTabChange('board')">
            <template #icon>
              <NIcon :size="15"><GridOutline /></NIcon>
            </template>
            กระดาน
          </NButton>
          <NButton :type="activeTab === 'calendar' ? 'primary' : 'default'" @click="handleTabChange('calendar')">
            <template #icon>
              <NIcon :size="15"><CalendarOutline /></NIcon>
            </template>
            ปฏิทิน
          </NButton>
        </NButtonGroup>
        <NButton type="primary" size="small" @click="openCreateForm">
          <template #icon>
            <NIcon><AddCircleOutline /></NIcon>
          </template>
          สร้างงานใหม่
        </NButton>
      </div>

      <!-- List View -->
      <template v-if="activeTab === 'list'">
        <!-- Filters -->
        <NCard class="filter-card" :bordered="false">
          <div class="filter-basic">
            <NSelect v-model:value="fiscalYearFilter" :options="fyOptions" placeholder="ปีงบประมาณ" size="small"
              class="filter-fy" clearable />
            <NInput v-model:value="searchFilter" placeholder="ค้นหางาน..." size="small" class="filter-search" clearable
              @keyup.enter="fetchTasks" />
            <NSelect v-model:value="statusFilter" :options="statusOptions" placeholder="สถานะ" size="small"
              class="filter-select" clearable />
            <NButton size="small" :type="showAdvancedFilters ? 'primary' : 'default'" secondary
              @click="showAdvancedFilters = !showAdvancedFilters">
              <template #icon>
                <NIcon :size="14"><FunnelOutline /></NIcon>
              </template>
              ตัวกรองเพิ่มเติม
              <NTag v-if="activeAdvancedCount > 0" size="small" round :bordered="false" type="primary"
                style="margin-left: 4px; line-height: 18px; min-width: 18px; text-align: center; padding: 0 4px">
                {{ activeAdvancedCount }}
              </NTag>
              <NIcon :size="14" style="margin-left: 2px">
                <ChevronDownOutline v-if="!showAdvancedFilters" />
                <ChevronUpOutline v-else />
              </NIcon>
            </NButton>
            <NButton size="small" quaternary @click="resetFilters">
              <template #icon>
                <NIcon><RefreshOutline /></NIcon>
              </template>
              ล้าง
            </NButton>
          </div>

          <transition name="filter-slide">
            <div v-if="showAdvancedFilters" class="filter-advanced">
              <div class="filter-dropdowns">
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
            </div>
          </transition>
        </NCard>

        <!-- Task Table (desktop) -->
        <NCard v-if="!isMobile" class="table-card" :bordered="false">
          <NDataTable :columns="columns" :data="tasks" :bordered="false" :single-line="false"
            :row-key="(row: any) => row.id" v-model:expanded-row-keys="expandedRowKeys" :remote-sort="true"
            :sort-by="sortBy ? { columnKey: sortBy, order: sortOrder || false } : undefined"
            @update:sorter="handleSorterChange" :row-props="(row: any) => ({
              style: 'cursor: pointer',
              onClick: (e: MouseEvent) => {
                const target = e.target as HTMLElement
                if (target.closest('.n-data-table-expand-trigger')) return
                openDetail(row.id)
              },
            })" :scroll-x="1100" size="small" />
        </NCard>

        <!-- Task Cards (mobile) -->
        <div v-else class="task-cards">
          <div v-for="task in tasks" :key="task.id" class="task-card" @click="openDetail(task.id)">
            <div class="task-card__header">
              <div class="task-card__title">{{ task.title }}</div>
              <div class="task-card__badges">
                <StatusBadge :name="task.statusName || '—'" :color="task.statusColor" />
                <PriorityBadge :priority="task.priority" />
              </div>
            </div>
            <div class="task-card__footer">
              <div class="task-card__dates">
                <span v-if="task.dueDate" class="task-card__date">
                  กำหนด: <ThaiDate :date="task.dueDate" format="short" />
                </span>
                <span v-if="task.subtaskCount" class="task-card__subtasks" @click.stop="toggleExpand(task.id)">
                  {{ task.completedSubtaskCount || 0 }}/{{ task.subtaskCount }} งานย่อย
                </span>
              </div>
              <div v-if="task.assignees?.length" class="task-card__assignees">
                <span v-for="(a, idx) in task.assignees" :key="a.id || idx" class="task-card__avatar"
                  :style="{ background: getInitials(a.name || '??', Number(idx)).bg, color: getInitials(a.name || '??', Number(idx)).color }">
                  {{ getInitials(a.name || '??', Number(idx)).initials }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="task-pagination">
          <NPagination v-model:page="page" v-model:page-size="pageSize" :item-count="total" :page-sizes="[10, 20, 50]" />
        </div>
      </template>

      <!-- Board View -->
      <ProjectTaskBoard v-else-if="activeTab === 'board'" :project-id="projectId" />

      <!-- Calendar View -->
      <ProjectTaskCalendar v-else-if="activeTab === 'calendar'" :project-id="projectId" />
    </div>
  </NSpin>

  <TaskForm v-model:show="showTaskForm" :task-id="editingTaskId" :initial-project-id="projectId"
    @created="fetchTasks" @updated="fetchTasks" />

  <TaskDetail v-model:show="showDetail" :task-id="detailTaskId"
    @edit="(id) => { editingTaskId = id; showTaskForm = true }" @deleted="fetchTasks" />
</template>

<style scoped>
.project-task-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.filter-basic {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-search {
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}

.filter-fy {
  width: 140px;
  flex-shrink: 0;
}

.filter-select {
  width: 148px;
  flex-shrink: 0;
}

.filter-advanced {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.filter-dropdowns {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-dates {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-top: var(--space-sm);
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

.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

.filter-slide-enter-to,
.filter-slide-leave-from {
  opacity: 1;
  max-height: 200px;
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

  .table-card {
    display: none;
  }
}

.task-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 10px);
  padding: 12px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.task-card__title {
  font-weight: 500;
  font-size: 14px;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.task-card__badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.task-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.task-card__dates {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.task-card__date {
  white-space: nowrap;
}

.task-card__subtasks {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-variant, #f0f0f0);
  padding: 1px 6px;
  border-radius: 10px;
  width: fit-content;
}

.task-card__assignees {
  display: flex;
  align-items: center;
}

.task-card__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid #fff;
}

.task-card__avatar + .task-card__avatar {
  margin-left: -6px;
}
</style>
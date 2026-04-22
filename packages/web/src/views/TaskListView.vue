<script setup lang="ts">
import { ref, computed, h, onMounted, watch } from 'vue'
import {
  NCard,
  NDataTable,
  NButton,
  NIcon,
  NSelect,
  NInput,
  NSpin,
  NTabPane,
  NTabs,
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
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import { useTaskStore } from '@/stores/task'
import { getFiscalYear } from '@/utils/thai'

const router = useRouter()
const message = useMessage()
const taskStore = useTaskStore()

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

const priorityFilter = ref<string | null>(null)
const searchFilter = ref('')
const fiscalYearFilter = ref<number | null>(currentFY)

const WORKSPACE_TYPE_LABELS: Record<string, { label: string; color?: string }> = {
  rental: { label: 'เช่าพื้นที่', color: '#2080f0' },
  consulting: { label: 'ที่ปรึกษา/วิจัย', color: '#18a058' },
  training: { label: 'อบรม/สัมนา', color: '#f0a020' },
  incubation: { label: 'บ่มเพาะ', color: '#8a2be2' },
  general: { label: 'ทั่วไป', color: '#909399' },
}

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

async function fetchTasks() {
  try {
    await taskStore.fetchTasks({
      priority: priorityFilter.value || undefined,
      search: searchFilter.value || undefined,
      fiscalYear: fiscalYearFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    tasks.value = taskStore.tasks
    total.value = taskStore.total
  } catch {
    message.error('โหลดรายการงานไม่สำเร็จ')
  }
}

const columns = [
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
    title: 'ความสำคัญ',
    key: 'priority',
    width: 110,
    render(row: any) {
      return h(PriorityBadge, { priority: row.priority })
    },
  },
  {
    title: 'พื้นที่งาน',
    key: 'workspaceType',
    width: 150,
    render(row: any) {
      const info = WORKSPACE_TYPE_LABELS[row.workspaceType] || WORKSPACE_TYPE_LABELS.general
      return h(NTag, { size: 'small', bordered: false, type: 'info' }, { default: () => info.label })
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

watch([priorityFilter, fiscalYearFilter, page], fetchTasks, { deep: true })
onMounted(fetchTasks)
</script>

<template>
  <NSpin :show="taskStore.loading">
    <div class="task-list-page">
      <PageHeader title="All Tasks" :subtitle="`${total} tasks`">
        <template #actions>
          <NButton type="primary" @click="openCreateForm">
            <template #icon>
              <NIcon>
                <AddCircleOutline />
              </NIcon>
            </template>
            New Task
          </NButton>
        </template>
      </PageHeader>

      <!-- View Tabs -->
      <NTabs v-model:value="activeTab" type="segment" class="view-tabs" @update:value="handleTabChange">
        <NTabPane name="list">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16">
                <ListOutline />
              </NIcon>
              List
            </div>
          </template>
        </NTabPane>
        <NTabPane name="board">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16">
                <GridOutline />
              </NIcon>
              Kanban Board
            </div>
          </template>
        </NTabPane>
        <NTabPane name="calendar">
          <template #tab>
            <div class="tab-label">
              <NIcon :size="16">
                <CalendarOutline />
              </NIcon>
              Calendar
            </div>
          </template>
        </NTabPane>
      </NTabs>

      <!-- Filters -->
      <NCard class="filter-card" :bordered="false">
        <div class="filter-row">
          <NIcon :size="18" color="var(--color-text-tertiary)" class="filter-icon">
            <FilterOutline />
          </NIcon>
          <NSelect v-model:value="fiscalYearFilter" :options="fyOptions" placeholder="ปีงบประมาณ" size="small"
            class="filter-select-fy" clearable />
          <NSelect v-model:value="priorityFilter" :options="priorityOptions" placeholder="ความสำคัญ" size="small"
            class="filter-select" clearable />
          <NInput v-model:value="searchFilter" placeholder="ค้นหางาน..." size="small" class="filter-search" clearable
            @keyup.enter="fetchTasks" />
        </div>
      </NCard>

      <!-- Task Table -->
      <NCard class="table-card" :bordered="false">
        <NDataTable :columns="columns" :data="tasks" :bordered="false" :single-line="false"
          :row-key="(row: any) => row.id"
          :row-props="(row: any) => ({ style: 'cursor: pointer', onClick: () => openDetail(row.id) })" :scroll-x="1100"
          size="small" />
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

.view-tabs {
  margin-bottom: var(--space-xs);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.filter-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.filter-icon {
  flex-shrink: 0;
}

.filter-select {
  width: 160px;
}

.filter-select-fy {
  width: 150px;
}

.filter-search {
  width: 220px;
}

.table-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.task-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}

@media (max-width: 767px) {
  .filter-icon {
    display: none;
  }

  .filter-select,
  .filter-select-fy,
  .filter-search {
    width: 100%;
  }
}
</style>

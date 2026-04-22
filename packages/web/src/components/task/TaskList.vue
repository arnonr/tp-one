<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NDataTable, NSelect, NInput, NPagination, NSpace, NButton, NEmpty, useMessage } from 'naive-ui'
import TaskCard from './TaskCard.vue'
import { taskService } from '@/services/task'
import { workspaceService } from '@/services/workspace'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const tasks = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const workspaces = ref<any[]>([])
const workspaceStatuses = ref<any[]>([])

const filters = ref({
  workspaceId: null as string | null,
  priority: null as string | null,
  search: '',
})

const workspaceOptions = computed(() =>
  workspaces.value.map((w) => ({ label: w.name, value: w.id }))
)

const priorityOptions = [
  { label: 'เร่งด่วน', value: 'urgent' },
  { label: 'สูง', value: 'high' },
  { label: 'ปกติ', value: 'normal' },
  { label: 'ต่ำ', value: 'low' },
]

async function fetchTasks() {
  loading.value = true
  try {
    const result = await taskService.list({
      workspaceId: filters.value.workspaceId || undefined,
      priority: filters.value.priority || undefined,
      search: filters.value.search || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    tasks.value = result.data || []
    total.value = result.total || 0
  } catch (e: any) {
    message.error('โหลดรายการงานไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

async function fetchWorkspaces() {
  try {
    workspaces.value = await workspaceService.list()
  } catch { }
}

function handleRowClick(row: any) {
  router.push(`/tasks/${row.id}`)
}

watch([filters, page], fetchTasks, { deep: true })
onMounted(() => {
  fetchTasks()
  fetchWorkspaces()
})

const columns = [
  {
    title: 'ชื่องาน',
    key: 'title',
    render(row: any) {
      return h('div', { style: 'font-weight: 500' }, [
        h('div', row.title),
        row.workspaceName ? h('div', { style: 'font-size: 0.75rem; color: var(--color-text-secondary)' }, row.workspaceName) : null,
      ])
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
    title: 'ความสำคัญ',
    key: 'priority',
    width: 110,
    render(row: any) {
      return h(PriorityBadge, { priority: row.priority })
    },
  },
  {
    title: 'มอบหมาย',
    key: 'assignees',
    width: 180,
    render(row: any) {
      if (!row.assignees?.length) return '—'
      const names = row.assignees.map((a: any) => a.name).join(', ')
      return h('span', { style: 'font-size: 0.85rem' }, names)
    },
  },
  {
    title: 'กำหนดส่ง',
    key: 'dueDate',
    width: 120,
    render(row: any) {
      if (!row.dueDate) return '—'
      return h(ThaiDate, { date: row.dueDate, format: 'short' })
    },
  },
]

import { h } from 'vue'
</script>

<template>
  <div class="task-list-page">
    <div class="task-filters">
      <NSelect v-model:value="filters.workspaceId" :options="workspaceOptions" placeholder="ทุกพื้นที่งาน" clearable
        style="width: 220px" />
      <NSelect v-model:value="filters.priority" :options="priorityOptions" placeholder="ทุกความสำคัญ" clearable
        style="width: 160px" />
      <NInput v-model:value="filters.search" placeholder="ค้นหางาน..." clearable style="width: 280px"
        @keyup.enter="fetchTasks" />
      <NButton type="primary" @click="fetchTasks">ค้นหา</NButton>
    </div>

    <NDataTable :columns="columns" :data="tasks" :loading="loading"
      :row-props="(row: any) => ({ style: 'cursor: pointer', onClick: () => handleRowClick(row) })" :bordered="false"
      striped />

    <div class="task-pagination">
      <NPagination v-model:page="page" v-model:page-size="pageSize" :item-count="total" :page-sizes="[10, 20, 50]" />
    </div>
  </div>
</template>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.task-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}
</style>

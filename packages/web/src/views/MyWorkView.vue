<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NCard, NText, NIcon, NButton, NTag, NSpin, NDropdown, NEmpty, useMessage } from 'naive-ui'
import {
  TodayOutline,
  AlertCircleOutline,
  HourglassOutline,
  ChevronForwardOutline,
  AddCircleOutline,
  RefreshOutline,
  CheckmarkCircleOutline,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { myWorkService } from '@/services/my-work'
import { taskService } from '@/services/task'
import { useTaskStore } from '@/stores/task'
import { useWorkspaceStore } from '@/stores/workspace'
import type { TaskPriority, WorkspaceStatus } from '@/types'

interface MyWorkTask {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  statusId?: string
  statusName?: string
  statusColor?: string
  workspaceId: string
  workspaceName?: string
  projectId?: string
  dueDate?: string
  completedAt?: string
  createdAt: string
}

interface WaitingTask {
  taskId: string
  taskTitle: string
  taskPriority: string
  workspaceName?: string
  waitingFor: string
  expectedDate?: string
  waitingSince: string
}

const router = useRouter()
const message = useMessage()
const taskStore = useTaskStore()
const wsStore = useWorkspaceStore()
const loading = ref(false)

const summary = ref({ today: 0, overdue: 0, thisWeek: 0, waiting: 0 })
const todayTasks = ref<MyWorkTask[]>([])
const overdueTasks = ref<MyWorkTask[]>([])
const upcomingTasks = ref<MyWorkTask[]>([])
const waitingTasks = ref<WaitingTask[]>([])

const allStatuses = computed(() => taskStore.statuses)
const updatingTaskId = ref<string | null>(null)

function statusOptions(task: MyWorkTask) {
  const taskStatuses = task.workspaceId
    ? (taskStore.workspaceStatuses[task.workspaceId] || [])
    : allStatuses.value

  return taskStatuses.map((s: WorkspaceStatus) => ({
    label: s.name,
    key: s.id,
    disabled: s.id === task.statusId,
  }))
}

async function handleStatusChange(task: MyWorkTask, newStatusId: string) {
  const prev = { statusId: task.statusId, statusName: task.statusName, statusColor: task.statusColor }
  const targetStatus = allStatuses.value.find(s => s.id === newStatusId)
  if (!targetStatus || targetStatus.id === task.statusId) return

  updatingTaskId.value = task.id
  task.statusId = targetStatus.id
  task.statusName = targetStatus.name
  task.statusColor = targetStatus.color

  try {
    await taskService.update(task.id, { statusId: newStatusId })
    message.success(`เปลี่ยนสถานะ "${task.title}" → ${targetStatus.name}`)
  } catch {
    task.statusId = prev.statusId
    task.statusName = prev.statusName
    task.statusColor = prev.statusColor
    message.error('เปลี่ยนสถานะไม่สำเร็จ')
  } finally {
    updatingTaskId.value = null
  }
}

async function handleComplete(task: MyWorkTask) {
  updatingTaskId.value = task.id
  try {
    await taskService.update(task.id, { completedAt: new Date().toISOString() })
    message.success(`เสร็จสิ้น "${task.title}"`)
    todayTasks.value = todayTasks.value.filter(t => t.id !== task.id)
    overdueTasks.value = overdueTasks.value.filter(t => t.id !== task.id)
    upcomingTasks.value = upcomingTasks.value.filter(t => t.id !== task.id)
    summary.value.today = todayTasks.value.length
    summary.value.overdue = overdueTasks.value.length
    summary.value.thisWeek = upcomingTasks.value.length
  } catch {
    message.error('อัปเดตไม่สำเร็จ')
  } finally {
    updatingTaskId.value = null
  }
}

async function fetchData() {
  loading.value = true
  try {
    await taskStore.fetchAllStatuses()
    const workspaceId = wsStore.currentWorkspaceId || undefined
    const data = await myWorkService.getAll(workspaceId)
    summary.value = data.summary || { today: 0, overdue: 0, thisWeek: 0, waiting: 0 }
    todayTasks.value = data.today || []
    overdueTasks.value = data.overdue || []
    upcomingTasks.value = data.upcoming || []
    waitingTasks.value = data.waiting || []
  } catch {
    message.error('โหลดข้อมูลไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(() => wsStore.currentWorkspaceId, fetchData)

function handleTaskClick(taskId: string) {
  router.push({ name: 'tasks', query: { detail: taskId } })
}

function handleCreate() {
  router.push({ name: 'tasks', query: { create: '1' } })
}

const summaryCards = computed(() => [
  { key: 'today', label: 'วันนี้', count: summary.value.today, color: 'var(--color-primary)', icon: TodayOutline },
  { key: 'overdue', label: 'เลยกำหนด', count: summary.value.overdue, color: 'var(--color-danger)', icon: AlertCircleOutline },
  { key: 'week', label: 'สัปดาห์นี้', count: summary.value.thisWeek, color: 'var(--color-text)', icon: HourglassOutline },
  { key: 'waiting', label: 'รอหน่วยงานอื่น', count: summary.value.waiting, color: 'var(--color-warning)', icon: HourglassOutline },
])
</script>

<template>
  <NSpin :show="loading">
    <div class="my-work">
      <PageHeader title="งานของฉัน" subtitle="ภาพรวมงานที่มอบหมายให้คุณ">
        <template #actions>
          <NButton quaternary circle @click="fetchData">
            <template #icon>
              <NIcon>
                <RefreshOutline />
              </NIcon>
            </template>
          </NButton>
          <NButton type="primary" @click="handleCreate">
            <template #icon>
              <NIcon>
                <AddCircleOutline />
              </NIcon>
            </template>
            สร้างงานใหม่
          </NButton>
        </template>
      </PageHeader>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <NCard v-for="card in summaryCards" :key="card.key" class="summary-card" :bordered="false" size="small">
          <div class="summary-card-inner">
            <NIcon :size="20" :color="card.color" class="summary-icon">
              <component :is="card.icon" />
            </NIcon>
            <div class="summary-card-text">
              <span class="summary-num" :style="{ color: card.color }">{{ card.count }}</span>
              <NText depth="3" class="summary-label">{{ card.label }}</NText>
            </div>
          </div>
        </NCard>
      </div>

      <!-- Today Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-primary)">
                <TodayOutline />
              </NIcon>
              <NText class="section-title">วันนี้</NText>
              <NTag :bordered="false" size="small" type="info">{{ todayTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in todayTasks" :key="task.id" class="task-row"
            :class="{ 'task-row--updating': updatingTaskId === task.id }">
            <div class="task-main" @click="handleTaskClick(task.id)">
              <NButton quaternary circle size="small" class="complete-btn" :loading="updatingTaskId === task.id"
                @click.stop="handleComplete(task)">
                <template #icon>
                  <NIcon>
                    <CheckmarkCircleOutline />
                  </NIcon>
                </template>
              </NButton>
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-sub">
                  <NText depth="3" class="task-project">{{ task.workspaceName }}</NText>
                </div>
              </div>
            </div>
            <div class="task-meta">
              <NDropdown v-if="task.statusName" trigger="click" :options="statusOptions(task)"
                @select="(key: string) => handleStatusChange(task, key)" @click.stop>
                <StatusBadge :name="task.statusName" :color="task.statusColor" />
              </NDropdown>
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <NEmpty v-if="!todayTasks.length && !loading" description="ไม่มีงานที่ต้องทำวันนี้" />
        </div>
      </NCard>

      <!-- Overdue Tasks -->
      <NCard class="section-card section-card--danger" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-danger)">
                <AlertCircleOutline />
              </NIcon>
              <NText class="section-title" style="color: var(--color-danger)">เลยกำหนด</NText>
              <NTag :bordered="false" size="small" type="error">{{ overdueTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in overdueTasks" :key="task.id" class="task-row"
            :class="{ 'task-row--updating': updatingTaskId === task.id }">
            <div class="task-main" @click="handleTaskClick(task.id)">
              <NButton quaternary circle size="small" class="complete-btn" :loading="updatingTaskId === task.id"
                @click.stop="handleComplete(task)">
                <template #icon>
                  <NIcon>
                    <CheckmarkCircleOutline />
                  </NIcon>
                </template>
              </NButton>
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-sub">
                  <NText depth="3" class="task-project">{{ task.workspaceName }}</NText>
                  <span class="task-due task-due--overdue">
                    <ThaiDate v-if="task.dueDate" :date="task.dueDate" format="relative" />
                  </span>
                </div>
              </div>
            </div>
            <div class="task-meta">
              <NDropdown v-if="task.statusName" trigger="click" :options="statusOptions(task)"
                @select="(key: string) => handleStatusChange(task, key)" @click.stop>
                <StatusBadge :name="task.statusName" :color="task.statusColor" />
              </NDropdown>
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <NEmpty v-if="!overdueTasks.length && !loading" description="ไม่มีงานที่เลยกำหนด" />
        </div>
      </NCard>

      <!-- Upcoming Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-text-secondary)">
                <HourglassOutline />
              </NIcon>
              <NText class="section-title">สัปดาห์นี้</NText>
              <NTag :bordered="false" size="small">{{ upcomingTasks.length }}</NTag>
            </div>
            <NButton text size="small" type="primary" @click="router.push({ name: 'tasks' })">
              ดูทั้งหมด
              <template #icon>
                <NIcon>
                  <ChevronForwardOutline />
                </NIcon>
              </template>
            </NButton>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in upcomingTasks" :key="task.id" class="task-row"
            :class="{ 'task-row--updating': updatingTaskId === task.id }">
            <div class="task-main" @click="handleTaskClick(task.id)">
              <NButton quaternary circle size="small" class="complete-btn" :loading="updatingTaskId === task.id"
                @click.stop="handleComplete(task)">
                <template #icon>
                  <NIcon>
                    <CheckmarkCircleOutline />
                  </NIcon>
                </template>
              </NButton>
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-sub">
                  <NText depth="3" class="task-project">{{ task.workspaceName }}</NText>
                  <ThaiDate v-if="task.dueDate" :date="task.dueDate" format="short" />
                </div>
              </div>
            </div>
            <div class="task-meta">
              <NDropdown v-if="task.statusName" trigger="click" :options="statusOptions(task)"
                @select="(key: string) => handleStatusChange(task, key)" @click.stop>
                <StatusBadge :name="task.statusName" :color="task.statusColor" />
              </NDropdown>
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <NEmpty v-if="!upcomingTasks.length && !loading" description="ไม่มีงานที่กำลังจะมาถึง" />
        </div>
      </NCard>

      <!-- Waiting for Others -->
      <NCard v-if="waitingTasks.length" class="section-card section-card--warning" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-warning)">
                <HourglassOutline />
              </NIcon>
              <NText class="section-title" style="color: var(--color-warning)">รอหน่วยงานอื่น</NText>
              <NTag :bordered="false" size="small" type="warning">{{ waitingTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in waitingTasks" :key="task.taskId" class="task-row" @click="handleTaskClick(task.taskId)">
            <div class="task-main">
              <div class="task-info">
                <div class="task-title">{{ task.taskTitle }}</div>
                <div class="task-sub">
                  <NText depth="3" class="task-project">รอ: {{ task.waitingFor }}</NText>
                  <ThaiDate v-if="task.expectedDate" :date="task.expectedDate" format="short" />
                </div>
              </div>
            </div>
            <div class="task-meta">
              <PriorityBadge v-if="task.taskPriority" :priority="(task.taskPriority as TaskPriority)" />
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>
</template>

<style scoped>
.my-work {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.summary-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.summary-card:hover {
  box-shadow: var(--shadow-md);
}

.summary-card-inner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.summary-icon {
  flex-shrink: 0;
}

.summary-card-text {
  display: flex;
  flex-direction: column;
}

.summary-num {
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.2;
}

.summary-label {
  font-size: var(--text-xs);
}

/* Section Card */
.section-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.section-card--danger {
  border-left: 3px solid var(--color-danger);
}

.section-card--warning {
  border-left: 3px solid var(--color-warning);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-title {
  font-size: var(--text-md);
  font-weight: 600;
}

/* Task List */
.task-list {
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.task-row:hover {
  background: var(--color-surface-variant);
  border-radius: var(--radius-sm);
}

.task-row:last-child {
  border-bottom: none;
}

.task-row--updating {
  opacity: 0.6;
  pointer-events: none;
}

.task-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.complete-btn {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.complete-btn:hover {
  color: var(--color-primary);
}

.task-info {
  min-width: 0;
}

.task-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-sub {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.task-project {
  font-size: var(--text-xs);
}

.task-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
  margin-left: var(--space-md);
}

.task-due--overdue {
  color: var(--color-danger) !important;
  font-weight: 500;
}

@media (max-width: 767px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .task-row {
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .task-meta {
    margin-left: 0;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NText, NIcon, NButton, NTag, NSpin, useMessage } from 'naive-ui'
import {
  TodayOutline,
  AlertCircleOutline,
  HourglassOutline,
  ChevronForwardOutline,
  AddCircleOutline,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { myWorkService } from '@/services/my-work'

const router = useRouter()
const message = useMessage()
const loading = ref(false)

const summary = ref({ today: 0, overdue: 0, thisWeek: 0, waiting: 0 })
const todayTasks = ref<any[]>([])
const overdueTasks = ref<any[]>([])
const upcomingTasks = ref<any[]>([])
const waitingTasks = ref<any[]>([])

async function fetchData() {
  loading.value = true
  try {
    const data = await myWorkService.getAll()
    summary.value = data.summary || { today: 0, overdue: 0, thisWeek: 0, waiting: 0 }
    todayTasks.value = data.today || []
    overdueTasks.value = data.overdue || []
    upcomingTasks.value = data.upcoming || []
    waitingTasks.value = data.waiting || []
  } catch {
    // Fallback to mock data for development
    summary.value = { today: 3, overdue: 2, thisWeek: 4, waiting: 1 }
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function handleTaskClick(taskId: string) {
  router.push(`/tasks/${taskId}`)
}
</script>

<template>
  <NSpin :show="loading">
    <div class="my-work">
      <PageHeader title="งานของฉัน" subtitle="งานที่มอบหมายให้คุณทั้งหมด">
        <template #actions>
          <NButton type="primary">
            <template #icon>
              <NIcon><AddCircleOutline /></NIcon>
            </template>
            สร้างงาน
          </NButton>
        </template>
      </PageHeader>

      <!-- Summary -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-num urgent">{{ summary.today }}</span>
          <NText depth="3">วันนี้</NText>
        </div>
        <div class="summary-divider" />
        <div class="summary-item">
          <span class="summary-num danger">{{ summary.overdue }}</span>
          <NText depth="3">เลยกำหนด</NText>
        </div>
        <div class="summary-divider" />
        <div class="summary-item">
          <span class="summary-num">{{ summary.thisWeek }}</span>
          <NText depth="3">สัปดาห์นี้</NText>
        </div>
        <div class="summary-divider" />
        <div class="summary-item">
          <span class="summary-num warning">{{ summary.waiting }}</span>
          <NText depth="3">รอหน่วยงานอื่น</NText>
        </div>
      </div>

      <!-- Today Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-primary)"><TodayOutline /></NIcon>
              <NText class="section-title">วันนี้</NText>
              <NTag :bordered="false" size="small" type="info">{{ todayTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in todayTasks" :key="task.id" class="task-row" @click="handleTaskClick(task.id)">
            <div class="task-main">
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <NText depth="3" class="task-project">{{ task.workspaceName }}</NText>
              </div>
            </div>
            <div class="task-meta">
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <div v-if="!todayTasks.length" class="empty-hint">
            <NText depth="3">ไม่มีงานที่ต้องทำวันนี้</NText>
          </div>
        </div>
      </NCard>

      <!-- Overdue Tasks -->
      <NCard class="section-card section-card--danger" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-danger)"><AlertCircleOutline /></NIcon>
              <NText class="section-title" style="color: var(--color-danger)">เลยกำหนด</NText>
              <NTag :bordered="false" size="small" type="error">{{ overdueTasks.length }}</NTag>
            </div>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in overdueTasks" :key="task.id" class="task-row" @click="handleTaskClick(task.id)">
            <div class="task-main">
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
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <div v-if="!overdueTasks.length" class="empty-hint">
            <NText depth="3">ไม่มีงานที่เลยกำหนด</NText>
          </div>
        </div>
      </NCard>

      <!-- Upcoming Tasks -->
      <NCard class="section-card" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-text-secondary)"><HourglassOutline /></NIcon>
              <NText class="section-title">สัปดาห์นี้</NText>
              <NTag :bordered="false" size="small">{{ upcomingTasks.length }}</NTag>
            </div>
            <NButton text size="small" type="primary" @click="router.push({ name: 'tasks' })">
              ดูทั้งหมด
              <template #icon>
                <NIcon><ChevronForwardOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </template>
        <div class="task-list">
          <div v-for="task in upcomingTasks" :key="task.id" class="task-row" @click="handleTaskClick(task.id)">
            <div class="task-main">
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-sub">
                  <NText depth="3" class="task-project">{{ task.workspaceName }}</NText>
                  <ThaiDate v-if="task.dueDate" :date="task.dueDate" format="short" />
                </div>
              </div>
            </div>
            <div class="task-meta">
              <PriorityBadge :priority="task.priority" />
            </div>
          </div>
          <div v-if="!upcomingTasks.length" class="empty-hint">
            <NText depth="3">ไม่มีงานที่กำลังจะมาถึง</NText>
          </div>
        </div>
      </NCard>

      <!-- Waiting for Others -->
      <NCard v-if="waitingTasks.length" class="section-card section-card--warning" :bordered="false">
        <template #header>
          <div class="section-header">
            <div class="section-header-left">
              <NIcon :size="20" color="var(--color-warning)"><HourglassOutline /></NIcon>
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

/* Summary Bar */
.summary-bar {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.summary-num {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

.summary-num.urgent { color: var(--color-primary); }
.summary-num.danger { color: var(--color-danger); }
.summary-num.warning { color: var(--color-warning); }

.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
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
  padding: var(--space-sm) 0;
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

.task-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
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

.empty-hint {
  text-align: center;
  padding: var(--space-md);
}

@media (max-width: 767px) {
  .summary-bar {
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
  }

  .summary-divider {
    display: none;
  }

  .summary-item {
    flex: 1;
    min-width: 80px;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
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

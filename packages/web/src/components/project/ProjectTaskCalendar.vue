<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NSpin,
  NCard,
  NText,
  NIcon,
  NButton,
  NSelect,
  useMessage,
} from 'naive-ui'
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  AddCircleOutline,
  TodayOutline,
} from '@vicons/ionicons5'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import ThaiDate from '@/components/common/ThaiDate.vue'
import { taskService } from '@/services/task'
import { useTaskStore } from '@/stores/task'
import { getFiscalYear } from '@/utils/thai'

const props = defineProps<{
  projectId: string
}>()

const message = useMessage()
const taskStore = useTaskStore()

const currentDate = ref(new Date())
const tasks = ref<any[]>([])
const loading = ref(false)
const currentFY = getFiscalYear()

const showTaskForm = ref(false)
const editingTaskId = ref<string | undefined>(undefined)
const defaultStartDate = ref<number | undefined>(undefined)
const defaultDueDate = ref<number | undefined>(undefined)
const showDetail = ref(false)
const detailTaskId = ref<string | null>(null)

const THAI_DAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
const DAYS_IN_WEEK = 7

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#cf1322',
  high: '#d46b08',
  normal: '#1890ff',
  low: '#8c8c8c',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'เร่งด่วน',
  high: 'สูง',
  normal: 'ปกติ',
  low: 'ต่ำ',
}

const monthLabel = computed(() => {
  const d = currentDate.value
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
  return `${months[d.getMonth()]} ${d.getFullYear() + 543}`
})

const taskMap = computed(() => {
  const map: Record<string, any[]> = {}
  for (const task of tasks.value) {
    if (!task.dueDate) continue
    const dateStr = task.dueDate.split('T')[0]
    if (!map[dateStr]) map[dateStr] = []
    map[dateStr].push(task)
  }
  return map
})

function getCalendarDays() {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7
  const days: { date: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean; tasks: any[] }[] = []

  const today = new Date()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    const dateStr = toLocalDateStr(d)
    days.push({ date: d.getDate(), dateStr, isCurrentMonth: false, isToday: false, tasks: [] })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const dateStr = toLocalDateStr(date)
    days.push({
      date: d,
      dateStr,
      isCurrentMonth: true,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
      tasks: taskMap.value[dateStr] || [],
    })
  }
  const remaining = DAYS_IN_WEEK - (days.length % DAYS_IN_WEEK)
  if (remaining < DAYS_IN_WEEK) {
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d)
      const dateStr = toLocalDateStr(date)
      days.push({ date: d, dateStr, isCurrentMonth: false, isToday: false, tasks: [] })
    }
  }
  return days
}

const calendarDays = computed(() => getCalendarDays())

function prevMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() - 1)
  currentDate.value = d
}

function nextMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + 1)
  currentDate.value = d
}

function goToday() {
  currentDate.value = new Date()
}

async function fetchCalendarTasks() {
  loading.value = true
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    const firstDay = toLocalDateStr(new Date(year, month, 1))
    const lastDay = toLocalDateStr(new Date(year, month + 1, 0))

    const result = await taskService.list({
      projectId: props.projectId,
      dueDateFrom: firstDay,
      dueDateTo: lastDay,
      pageSize: 200,
    })
    tasks.value = result.data || result || []
  } catch {
    message.error('โหลดข้อมูลปฏิทินไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingTaskId.value = undefined
  defaultStartDate.value = undefined
  defaultDueDate.value = undefined
  showTaskForm.value = true
}

function openCreateFormOnDate(dateStr: string) {
  editingTaskId.value = undefined
  const ts = new Date(dateStr + 'T00:00:00').getTime()
  defaultStartDate.value = ts
  defaultDueDate.value = ts
  showTaskForm.value = true
}

function openDetail(taskId: string) {
  detailTaskId.value = taskId
  showDetail.value = true
}

watch(currentDate, fetchCalendarTasks)

onMounted(() => {
  fetchCalendarTasks()
})
</script>

<template>
  <NSpin :show="loading">
    <div class="project-task-calendar">
      <div class="calendar-toolbar">
        <NButton quaternary circle size="small" @click="prevMonth">
          <template #icon><NIcon><ChevronBackOutline /></NIcon></template>
        </NButton>
        <NText class="calendar-month">{{ monthLabel }}</NText>
        <NButton quaternary circle size="small" @click="nextMonth">
          <template #icon><NIcon><ChevronForwardOutline /></NIcon></template>
        </NButton>
        <NButton size="small" secondary @click="goToday">
          <template #icon><NIcon :size="14"><TodayOutline /></NIcon></template>
          วันนี้
        </NButton>
      </div>

      <NCard class="calendar-card" :bordered="false">
        <div class="calendar-grid">
          <div v-for="day in THAI_DAYS" :key="day" class="calendar-day-header">
            {{ day }}
          </div>
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="calendar-day"
            :class="{
              'calendar-day--other': !day.isCurrentMonth,
              'calendar-day--today': day.isToday,
              'calendar-day--clickable': day.isCurrentMonth,
            }"
            @click="day.isCurrentMonth && !day.tasks.length && openCreateFormOnDate(day.dateStr)"
          >
            <span class="day-number" :class="{ 'day-number--today': day.isToday }">{{ day.date }}</span>
            <div class="day-tasks">
              <div
                v-for="task in day.tasks"
                :key="task.id"
                class="day-task"
                :style="{ borderLeftColor: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal }"
                :title="`${task.title} (${PRIORITY_LABELS[task.priority] || task.priority})`"
                @click="openDetail(task.id)"
              >
                {{ task.title }}
              </div>
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </NSpin>

  <TaskForm
    v-model:show="showTaskForm"
    :task-id="editingTaskId"
    :initial-project-id="projectId"
    :default-start-date="defaultStartDate"
    :default-due-date="defaultDueDate"
    @created="fetchCalendarTasks"
    @updated="fetchCalendarTasks"
  />

  <TaskDetail
    v-model:show="showDetail"
    :task-id="detailTaskId"
    @edit="(id) => { editingTaskId = id; showTaskForm = true }"
    @deleted="fetchCalendarTasks"
  />
</template>

<style scoped>
.project-task-calendar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  justify-content: center;
}

.calendar-month {
  font-size: var(--text-lg);
  font-weight: 600;
  min-width: 180px;
  text-align: center;
}

.calendar-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid var(--color-border-light);
  border-left: 1px solid var(--color-border-light);
}

.calendar-day-header {
  padding: var(--space-sm);
  text-align: center;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface-variant);
  border-right: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
}

.calendar-day {
  min-height: 100px;
  padding: var(--space-xs);
  border-right: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--duration-fast) var(--ease-out);
}

.calendar-day:hover {
  background: var(--color-surface-variant);
}

.calendar-day--other {
  background: var(--color-surface-variant);
}

.calendar-day--clickable {
  cursor: pointer;
}

.calendar-day--other .day-number {
  color: var(--color-text-tertiary);
}

.calendar-day--today {
  background: var(--color-primary-bg);
}

.day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 500;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
}

.day-number--today {
  background: var(--color-primary);
  color: white;
  font-weight: 600;
}

.day-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--space-2xs);
}

.day-task {
  font-size: var(--text-xs);
  padding: 1px 4px 1px 6px;
  border-left: 3px solid;
  border-radius: 2px;
  background: var(--color-surface);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.day-task:hover {
  filter: brightness(0.95);
}
</style>
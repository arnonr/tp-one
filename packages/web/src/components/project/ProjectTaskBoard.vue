<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NSpin, useMessage, NEmpty, NCard, NIcon, NTag, NText } from 'naive-ui'
import TaskCard from '@/components/task/TaskCard.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import TaskDetail from '@/components/task/TaskDetail.vue'
import { taskService } from '@/services/task'
import { workspaceService } from '@/services/workspace'
import { useTaskStore } from '@/stores/task'

const props = defineProps<{
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'tasksChanged'): void
}>()

const message = useMessage()
const taskStore = useTaskStore()

const loading = ref(false)
const tasks = ref<any[]>([])
const statusColumns = ref<any[]>([])
const showTaskForm = ref(false)
const editingTaskId = ref<string | undefined>(undefined)
const showDetail = ref(false)
const detailTaskId = ref<string | null>(null)

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#cf1322',
  high: '#d46b08',
  normal: '#1890ff',
  low: '#8c8c8c',
}

async function fetchBoard() {
  loading.value = true
  try {
    const result = await taskService.list({ projectId: props.projectId, pageSize: 200 })
    const rawTasks = result.data || result || []
    tasks.value = rawTasks

    // Get statuses from the workspace that tasks belong to
    const wsIds = [...new Set(rawTasks.map((t: any) => t.workspaceId).filter(Boolean))] as string[]
    if (wsIds.length > 0) {
      const statuses = await workspaceService.getStatuses(wsIds[0])
      statusColumns.value = statuses
    } else {
      // Fallback: extract statuses from tasks themselves
      statusColumns.value = []
      for (const task of rawTasks) {
        if (task.statusId && !statusColumns.value.find((s: any) => s.id === task.statusId)) {
          statusColumns.value.push({ id: task.statusId, name: task.statusName || 'สถานะ', color: task.statusColor || '#888' })
        }
      }
    }
  } catch {
    message.error('โหลดบอร์ดไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

const tasksByStatus = computed(() => {
  const grouped: Record<string, any[]> = {}
  for (const col of statusColumns.value) {
    grouped[col.id] = []
  }
  for (const task of tasks.value) {
    const key = task.statusId || 'unassigned'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(task)
  }
  return grouped
})

function getColumnTasks(statusId: string) {
  return tasksByStatus.value[statusId] || []
}

function handleDragStart(event: DragEvent, taskId: string) {
  event.dataTransfer?.setData('taskId', taskId)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

async function handleDrop(event: DragEvent, targetStatusId: string) {
  event.preventDefault()
  const taskId = event.dataTransfer?.getData('taskId')
  if (!taskId) return

  try {
    await taskStore.updateTask(taskId, { statusId: targetStatusId })
    await fetchBoard()
    emit('tasksChanged')
    message.success('อัปเดตสถานะสำเร็จ')
  } catch {
    message.error('อัปเดตสถานะไม่สำเร็จ')
  }
}

function openCreateForm() {
  editingTaskId.value = undefined
  showTaskForm.value = true
}

function openDetail(taskId: string) {
  detailTaskId.value = taskId
  showDetail.value = true
}

onMounted(() => {
  fetchBoard()
})
</script>

<template>
  <NSpin :show="loading">
    <div class="project-task-board">
      <div v-if="statusColumns.length === 0" class="board-empty">
        <NEmpty description="ยังไม่มีสถานะงาน" />
      </div>

      <div v-else class="board-columns">
        <div
          v-for="col in statusColumns"
          :key="col.id"
          class="board-column"
          @dragover="handleDragOver"
          @drop="(e) => handleDrop(e, col.id)"
        >
          <div class="column-header">
            <div class="column-status-dot" :style="{ background: col.color }" />
            <NText class="column-title">{{ col.name }}</NText>
            <NTag size="small" round :bordered="false">
              {{ getColumnTasks(col.id).length }}
            </NTag>
          </div>

          <div class="column-tasks">
            <div
              v-for="task in getColumnTasks(col.id)"
              :key="task.id"
              class="task-card-wrapper"
              draggable="true"
              @dragstart="(e) => handleDragStart(e, task.id)"
              @click="openDetail(task.id)"
            >
              <TaskCard
                :id="task.id"
                :title="task.title"
                :priority="task.priority"
                :status-name="task.statusName"
                :status-color="task.statusColor"
                :workspace-name="task.workspaceName"
                :assignees="task.assignees"
                :due-date="task.dueDate"
                :start-date="task.startDate"
                :description="task.description"
              />
            </div>

            <div v-if="getColumnTasks(col.id).length === 0" class="column-empty">
              <NText depth="3" class="drop-hint">วางงานที่นี่</NText>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NSpin>

  <TaskForm
    v-model:show="showTaskForm"
    :task-id="editingTaskId"
    :initial-project-id="projectId"
    @created="emit('tasksChanged'); fetchBoard()"
    @updated="emit('tasksChanged'); fetchBoard()"
  />

  <TaskDetail
    v-model:show="showDetail"
    :task-id="detailTaskId"
    @edit="(id) => { editingTaskId = id; showTaskForm = true }"
    @deleted="emit('tasksChanged'); fetchBoard()"
  />
</template>

<style scoped>
.project-task-board {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.board-toolbar {
  display: flex;
  justify-content: flex-end;
}

.board-empty {
  padding: var(--space-xl);
  text-align: center;
}

.board-columns {
  display: flex;
  gap: var(--space-md);
  overflow-x: auto;
  padding-bottom: var(--space-md);
}

.board-column {
  flex: 1;
  min-width: 260px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.column-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-title {
  flex: 1;
  font-weight: 600;
  font-size: var(--text-sm);
}

.column-tasks {
  flex: 1;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 200px;
}

.task-card-wrapper {
  cursor: grab;
}

.task-card-wrapper:active {
  cursor: grabbing;
}

.column-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

.drop-hint {
  font-size: var(--text-xs);
}

@media (max-width: 767px) {
  .board-columns {
    flex-direction: column;
  }

  .board-column {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>
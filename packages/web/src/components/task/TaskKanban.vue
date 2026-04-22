<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NScrollbar, NButton, NIcon, NSpin, useMessage } from 'naive-ui'
import { AddCircleOutline } from '@vicons/ionicons5'
import TaskCard from './TaskCard.vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import { taskService, type TaskListParams } from '@/services/task'
import { workspaceService } from '@/services/workspace'

const props = defineProps<{
  workspaceId?: string
}>()

const emit = defineEmits<{
  taskClick: [id: string]
}>()

const message = useMessage()
const loading = ref(false)
const statuses = ref<any[]>([])
const tasksByStatus = ref<Record<string, any[]>>({})

async function fetchBoard() {
  loading.value = true
  try {
    // Get statuses for workspace
    if (props.workspaceId) {
      statuses.value = await workspaceService.getStatuses(props.workspaceId)
    } else {
      // Load all workspaces and their statuses
      const wsList = await workspaceService.list()
      const allStatuses: any[] = []
      for (const ws of wsList) {
        const wsStatuses = await workspaceService.getStatuses(ws.id)
        allStatuses.push(...wsStatuses)
      }
      statuses.value = allStatuses
    }

    // Get tasks
    const result = await taskService.list({
      workspaceId: props.workspaceId,
      pageSize: 100,
    })

    // Group tasks by statusId
    const grouped: Record<string, any[]> = {}
    for (const status of statuses.value) {
      grouped[status.id] = []
    }
    for (const task of result.data || []) {
      const statusId = task.statusId || 'unassigned'
      if (!grouped[statusId]) grouped[statusId] = []
      grouped[statusId].push(task)
    }
    tasksByStatus.value = grouped
  } catch {
    message.error('โหลดบอร์ดไม่สำเร็จ')
  } finally {
    loading.value = false
  }
}

async function handleDragEnd(event: DragEvent, targetStatusId: string) {
  const taskId = event.dataTransfer?.getData('taskId')
  if (!taskId) return

  try {
    await taskService.update(taskId, { statusId: targetStatusId })
    // Refresh board
    await fetchBoard()
    message.success('อัปเดตสถานะสำเร็จ')
  } catch {
    message.error('อัปเดตสถานะไม่สำเร็จ')
  }
}

function handleDragStart(event: DragEvent, taskId: string) {
  event.dataTransfer?.setData('taskId', taskId)
}

onMounted(fetchBoard)
</script>

<template>
  <NSpin :show="loading">
    <div class="kanban-board">
      <NScrollbar x-scrollable>
        <div class="board-columns">
          <div
            v-for="status in statuses"
            :key="status.id"
            class="board-column"
            @dragover.prevent
            @drop="handleDragEnd($event, status.id)"
          >
            <div class="column-header">
              <span class="column-dot" :style="{ backgroundColor: status.color || '#94a3b8' }" />
              <span class="column-title">{{ status.name }}</span>
              <span class="column-count">{{ (tasksByStatus[status.id] || []).length }}</span>
            </div>
            <NScrollbar class="column-body">
              <div class="column-cards">
                <div
                  v-for="task in tasksByStatus[status.id] || []"
                  :key="task.id"
                  draggable="true"
                  @dragstart="handleDragStart($event, task.id)"
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
                    :description="task.description"
                    @click="emit('taskClick', task.id)"
                  />
                </div>
              </div>
            </NScrollbar>
          </div>
        </div>
      </NScrollbar>
    </div>
  </NSpin>
</template>

<style scoped>
.kanban-board {
  min-height: 400px;
}

.board-columns {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  min-height: 500px;
}

.board-column {
  min-width: 300px;
  max-width: 320px;
  flex-shrink: 0;
  background: var(--color-surface-variant);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 240px);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.875rem;
}

.column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-title {
  flex: 1;
}

.column-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  padding: 1px 8px;
  border-radius: 9999px;
}

.column-body {
  flex: 1;
  overflow: hidden;
}

.column-cards {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-cards > div {
  cursor: grab;
}

.column-cards > div:active {
  cursor: grabbing;
}
</style>

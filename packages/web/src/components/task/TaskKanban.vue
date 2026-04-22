<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { NScrollbar, NButton, NIcon, NSpin, useMessage, NEmpty, NDropdown } from 'naive-ui'
import { AddCircleOutline } from '@vicons/ionicons5'
import TaskCard from './TaskCard.vue'
import TaskForm from './TaskForm.vue'
import { taskService } from '@/services/task'
import { workspaceService } from '@/services/workspace'
import { useWorkspaceStore } from '@/stores/workspace'

const props = defineProps<{
  workspaceId?: string
  gridMode?: boolean
}>()

const emit = defineEmits<{
  taskClick: [id: string]
  created: []
  updated: []
}>()

const message = useMessage()
const wsStore = useWorkspaceStore()
const loading = ref(false)
const workspaces = ref<any[]>([])
const workspaceStatuses = ref<Record<string, any[]>>({})
const tasksByStatus = ref<Record<string, any[]>>({})
const showTaskForm = ref(false)
const formWorkspaceId = ref<string | undefined>(undefined)
const formStatusId = ref<string | undefined>(undefined)
const isMobile = ref(window.innerWidth < 768)

async function fetchBoard() {
  loading.value = true
  try {
    let wsList: any[]
    if (props.workspaceId) {
      wsList = [await workspaceService.getById(props.workspaceId)]
    } else if (wsStore.isAllWorkspaces) {
      wsList = wsStore.workspaces.length ? wsStore.workspaces : await workspaceService.list()
    } else if (wsStore.currentWorkspaceId) {
      const found = wsStore.workspaces.find(ws => ws.id === wsStore.currentWorkspaceId)
      wsList = found ? [found] : [await workspaceService.getById(wsStore.currentWorkspaceId)]
    } else {
      wsList = wsStore.workspaces.length ? wsStore.workspaces : await workspaceService.list()
    }

    workspaces.value = wsList

    const allTasks: any[] = []
    const allStatuses: Record<string, any[]> = {}

    for (const ws of wsList) {
      const statuses = await workspaceService.getStatuses(ws.id)
      allStatuses[ws.id] = statuses

      const result = await taskService.list({
        workspaceId: ws.id,
        pageSize: 200,
      })
      allTasks.push(...(result.data || []))
    }

    workspaceStatuses.value = allStatuses

    const grouped: Record<string, any[]> = {}
    for (const ws of wsList) {
      for (const status of allStatuses[ws.id] || []) {
        grouped[status.id] = []
      }
    }
    for (const task of allTasks) {
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
    await fetchBoard()
    message.success('อัปเดตสถานะสำเร็จ')
  } catch {
    message.error('อัปเดตสถานะไม่สำเร็จ')
  }
}

function handleDragStart(event: DragEvent, taskId: string) {
  event.dataTransfer?.setData('taskId', taskId)
}

async function handleMobileStatusChange(taskId: string, newStatusId: string, currentStatusId: string) {
  if (newStatusId === currentStatusId) return

  const taskList = tasksByStatus.value[currentStatusId]
  const task = taskList?.find(t => t.id === taskId)
  if (!task) return

  // Optimistic update
  const prevList = [...(taskList || [])]
  tasksByStatus.value[currentStatusId] = prevList.filter(t => t.id !== taskId)
  task.statusId = newStatusId
  if (!tasksByStatus.value[newStatusId]) tasksByStatus.value[newStatusId] = []
  tasksByStatus.value[newStatusId].push(task)

  try {
    await taskService.update(taskId, { statusId: newStatusId })
    message.success('เปลี่ยนสถานะสำเร็จ')
  } catch {
    // Rollback
    tasksByStatus.value[newStatusId] = tasksByStatus.value[newStatusId].filter(t => t.id !== taskId)
    tasksByStatus.value[currentStatusId] = prevList
    task.statusId = currentStatusId
    message.error('เปลี่ยนสถานะไม่สำเร็จ')
  }
}

function getStatusOptionsForTask(task: any, wsId: string) {
  const statuses = workspaceStatuses.value[wsId] || []
  return statuses
    .filter(s => s.id !== task.statusId)
    .map(s => ({ label: s.name, key: s.id }))
}

function getStatusLabel(statusId: string, wsId: string) {
  const statuses = workspaceStatuses.value[wsId] || []
  return statuses.find(s => s.id === statusId)?.name || '—'
}

function openCreateForm(workspaceId: string, statusId?: string) {
  formWorkspaceId.value = workspaceId
  formStatusId.value = statusId
  showTaskForm.value = true
}

function onFormCreated() {
  showTaskForm.value = false
  fetchBoard()
  emit('created')
}

function onResize() {
  isMobile.value = window.innerWidth < 768
}

onMounted(fetchBoard)
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

watch(() => wsStore.currentWorkspaceId, fetchBoard)
</script>

<template>
  <NSpin :show="loading">
    <div class="kanban-board">
      <div v-if="!loading && workspaces.length === 0" class="empty-state">
        <NEmpty description="ยังไม่มีพื้นที่ทำงาน" />
      </div>
      <template v-else>
        <div v-for="ws in workspaces" :key="ws.id" class="workspace-section">
          <div class="workspace-header">
            <span class="workspace-dot" :style="{ backgroundColor: ws.color || '#94a3b8' }" />
            <span class="workspace-name">{{ ws.name }}</span>
          </div>

          <!-- Desktop: Horizontal Kanban -->
          <NScrollbar v-if="!isMobile" x-scrollable>
            <div class="board-columns">
              <div
                v-for="status in (workspaceStatuses[ws.id] || [])"
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
                        :status-name="status.name"
                        :status-color="status.color"
                        :workspace-name="ws.name"
                        :assignees="task.assignees"
                        :due-date="task.dueDate"
                        :description="task.description"
                        @click="emit('taskClick', task.id)"
                      />
                    </div>
                    <div v-if="!tasksByStatus[status.id]?.length" class="empty-column">
                      <span>ยังไม่มีงาน</span>
                    </div>
                  </div>
                </NScrollbar>
                <div class="column-footer">
                  <NButton
                    text
                    size="small"
                    @click="openCreateForm(ws.id, status.id)"
                  >
                    <template #icon>
                      <NIcon><AddCircleOutline /></NIcon>
                    </template>
                    เพิ่มงาน
                  </NButton>
                </div>
              </div>
            </div>
          </NScrollbar>

          <!-- Mobile: Vertical Stacked Layout -->
          <div v-else class="mobile-board">
            <div
              v-for="status in (workspaceStatuses[ws.id] || [])"
              :key="status.id"
              class="mobile-status-group"
            >
              <div class="mobile-status-header">
                <div class="mobile-status-label">
                  <span class="column-dot" :style="{ backgroundColor: status.color || '#94a3b8' }" />
                  <span class="mobile-status-name">{{ status.name }}</span>
                  <span class="column-count">{{ (tasksByStatus[status.id] || []).length }}</span>
                </div>
                <NButton
                  text
                  size="tiny"
                  @click="openCreateForm(ws.id, status.id)"
                >
                  <template #icon>
                    <NIcon :size="16"><AddCircleOutline /></NIcon>
                  </template>
                </NButton>
              </div>

              <div v-if="!tasksByStatus[status.id]?.length" class="empty-column">
                <span>ยังไม่มีงาน</span>
              </div>

              <div
                v-for="task in tasksByStatus[status.id] || []"
                :key="task.id"
                class="mobile-task-wrapper"
              >
                <TaskCard
                  :id="task.id"
                  :title="task.title"
                  :priority="task.priority"
                  :status-name="status.name"
                  :status-color="status.color"
                  :workspace-name="ws.name"
                  :assignees="task.assignees"
                  :due-date="task.dueDate"
                  :description="task.description"
                  @click="emit('taskClick', task.id)"
                />
                <div class="mobile-status-action" @click.stop>
                  <NDropdown
                    :options="getStatusOptionsForTask(task, ws.id)"
                    trigger="click"
                    @select="(key: string) => handleMobileStatusChange(task.id, key, status.id)"
                  >
                    <NButton size="tiny" secondary>
                      ย้ายสถานะ
                    </NButton>
                  </NDropdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </NSpin>

  <TaskForm
    v-model:show="showTaskForm"
    :workspace-id="formWorkspaceId"
    :default-status-id="formStatusId"
    @created="onFormCreated"
    @updated="fetchBoard(); emit('updated')"
  />
</template>

<style scoped>
.kanban-board {
  min-height: 400px;
}

.empty-state {
  padding: 48px;
  text-align: center;
}

.workspace-section {
  margin-bottom: 24px;
}

.workspace-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
}

.workspace-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.workspace-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

/* ─── Desktop Kanban ─── */
.board-columns {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  min-height: 400px;
}

.board-column {
  min-width: 280px;
  max-width: 300px;
  flex-shrink: 0;
  background: var(--color-surface-variant);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 320px);
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

.empty-column {
  padding: 16px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.column-footer {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-border);
}

.column-footer .n-button {
  width: 100%;
}

/* ─── Mobile Board ─── */
.mobile-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-status-group {
  background: var(--color-surface-variant);
  border-radius: var(--radius-lg);
  padding: 12px;
}

.mobile-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mobile-status-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.875rem;
}

.mobile-status-name {
  flex: 1;
}

.mobile-task-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.mobile-task-wrapper:last-child {
  margin-bottom: 0;
}

.mobile-status-action {
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
}

@media (min-width: 768px) {
  .mobile-board {
    display: none;
  }
}
</style>

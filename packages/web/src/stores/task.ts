import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskService, type TaskListParams } from '@/services/task'
import { workspaceService } from '@/services/workspace'
import type { Tag, Task, WorkspaceStatus } from '@/types'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const subtasks = ref<Task[]>([])
  const comments = ref<any[]>([])
  const workspaceTags = ref<Tag[]>([])
  const statuses = ref<WorkspaceStatus[]>([])
  const workspaceStatuses = ref<Record<string, WorkspaceStatus[]>>({})

  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)

  const filters = ref<TaskListParams>({})

  async function fetchTasks(override?: TaskListParams) {
    loading.value = true
    try {
      const result = await taskService.list({ ...filters.value, ...override })
      tasks.value = result.data || []
      total.value = result.total || 0
      page.value = result.page || 1
    } finally {
      loading.value = false
    }
  }

  async function fetchTaskById(id: string) {
    loading.value = true
    try {
      currentTask.value = await taskService.getById(id)
      await Promise.all([fetchSubtasks(id), fetchComments(id)])
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: any) {
    const task = await taskService.create(data)
    return task
  }

  async function updateTask(id: string, data: any) {
    const task = await taskService.update(id, data)
    if (currentTask.value?.id === id) {
      currentTask.value = task
    }
    return task
  }

  async function deleteTask(id: string) {
    await taskService.delete(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
    if (currentTask.value?.id === id) {
      currentTask.value = null
    }
  }

  async function fetchSubtasks(taskId: string) {
    try {
      subtasks.value = await taskService.getSubtasks(taskId)
    } catch {
      subtasks.value = []
    }
  }

  async function fetchComments(taskId: string) {
    try {
      comments.value = await taskService.getComments(taskId)
    } catch {
      comments.value = []
    }
  }

  async function addComment(taskId: string, content: string) {
    const comment = await taskService.addComment(taskId, content)
    comments.value.push(comment)
    return comment
  }

  async function fetchWorkspaceTags(workspaceId: string) {
    try {
      workspaceTags.value = await taskService.getTags(workspaceId)
    } catch {
      workspaceTags.value = []
    }
  }

  async function addSubtask(parentId: string, title: string) {
    const task = currentTask.value
    if (!task) return
    const subtask = await taskService.createSubtask(parentId, title, task.workspaceId)
    subtasks.value.push(subtask)
    return subtask
  }

  async function toggleSubtask(subtaskId: string, done: boolean) {
    const completedAt = done ? new Date().toISOString() : null
    const updated = await taskService.updateSubtask(subtaskId, { completedAt })
    const idx = subtasks.value.findIndex(s => s.id === subtaskId)
    if (idx !== -1) subtasks.value[idx] = { ...subtasks.value[idx], ...updated }
    return updated
  }

  async function removeSubtask(subtaskId: string) {
    await taskService.deleteSubtask(subtaskId)
    subtasks.value = subtasks.value.filter(s => s.id !== subtaskId)
  }

  async function fetchWorkspaceStatuses(workspaceId: string) {
    if (workspaceStatuses.value[workspaceId]) {
      return workspaceStatuses.value[workspaceId]
    }
    const result = await workspaceService.getStatuses(workspaceId)
    workspaceStatuses.value[workspaceId] = result
    return result
  }

  async function fetchAllStatuses() {
    const wsList = await workspaceService.list()
    const allStatuses: WorkspaceStatus[] = []
    for (const ws of wsList) {
      const wsStatuses = await workspaceService.getStatuses(ws.id)
      workspaceStatuses.value[ws.id] = wsStatuses
      allStatuses.push(...wsStatuses)
    }
    statuses.value = allStatuses
    return allStatuses
  }

  function clearCurrent() {
    currentTask.value = null
    subtasks.value = []
    comments.value = []
  }

  return {
    tasks, currentTask, subtasks, comments, workspaceTags, statuses, workspaceStatuses,
    loading, total, page, pageSize, filters,
    fetchTasks, fetchTaskById, createTask, updateTask, deleteTask,
    fetchSubtasks, fetchComments, addComment,
    fetchWorkspaceTags, addSubtask, toggleSubtask, removeSubtask,
    fetchWorkspaceStatuses, fetchAllStatuses,
    clearCurrent,
  }
})

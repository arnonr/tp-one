import api from './api'

export interface TaskListParams {
  workspaceId?: string
  projectId?: string
  assigneeId?: string
  status?: string
  priority?: string
  search?: string
  fiscalYear?: number
  startDateFrom?: string
  startDateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
  page?: number
  pageSize?: number
}

export const taskService = {
  async list(params: TaskListParams = {}) {
    const query = new URLSearchParams()
    if (params.workspaceId) query.set('workspaceId', params.workspaceId)
    if (params.projectId) query.set('projectId', params.projectId)
    if (params.assigneeId) query.set('assigneeId', params.assigneeId)
    if (params.status) query.set('status', params.status)
    if (params.priority) query.set('priority', params.priority)
    if (params.search) query.set('search', params.search)
    if (params.fiscalYear) query.set('fiscalYear', String(params.fiscalYear))
    if (params.startDateFrom) query.set('startDateFrom', params.startDateFrom)
    if (params.startDateTo) query.set('startDateTo', params.startDateTo)
    if (params.dueDateFrom) query.set('dueDateFrom', params.dueDateFrom)
    if (params.dueDateTo) query.set('dueDateTo', params.dueDateTo)
    if (params.page) query.set('page', String(params.page))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    const { data } = await api.get(`/tasks?${query.toString()}`)
    return data
  },

  async getById(id: string) {
    const { data } = await api.get(`/tasks/${id}`)
    return data.data
  },

  async create(body: any) {
    const { data } = await api.post('/tasks', body)
    return data.data
  },

  async update(id: string, body: any) {
    const { data } = await api.patch(`/tasks/${id}`, body)
    return data.data
  },

  async delete(id: string) {
    await api.delete(`/tasks/${id}`)
  },

  async getSubtasks(taskId: string) {
    const { data } = await api.get(`/tasks/${taskId}/subtasks`)
    return data.data
  },

  async getComments(taskId: string) {
    const { data } = await api.get(`/tasks/${taskId}/comments`)
    return data.data
  },

  async addComment(taskId: string, content: string) {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { content })
    return data.data
  },

  async batchUpdateStatus(updates: Array<{ taskId: string; statusId: string; sortOrder?: number }>) {
    const { data } = await api.post('/tasks/batch/status', { updates })
    return data
  },

  async getTags(workspaceId: string) {
    const { data } = await api.get(`/tasks/tags?workspaceId=${workspaceId}`)
    return data.data as import('@/types').Tag[]
  },

  async createTag(workspaceId: string, name: string, color?: string) {
    const { data } = await api.post('/tasks/tags', { workspaceId, name, color })
    return data.data as import('@/types').Tag
  },

  async setTaskTags(taskId: string, tagIds: string[]) {
    await api.put(`/tasks/${taskId}/tags`, { tagIds })
  },

  async createSubtask(parentId: string, title: string, workspaceId: string) {
    const { data } = await api.post('/tasks', { parentId, title, workspaceId })
    return data.data
  },

  async updateSubtask(id: string, data: Record<string, unknown>) {
    const { data: res } = await api.patch(`/tasks/${id}`, data)
    return res.data
  },

  async deleteSubtask(id: string) {
    await api.delete(`/tasks/${id}`)
  },
}

import api from './api'

export const myWorkService = {
  async getAll(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined
    const { data } = await api.get('/my-work', { params })
    return data.data
  },

  async getSummary(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined
    const { data } = await api.get('/my-work/summary', { params })
    return data.data
  },

  async getToday(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined
    const { data } = await api.get('/my-work/today', { params })
    return data.data
  },

  async getOverdue(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined
    const { data } = await api.get('/my-work/overdue', { params })
    return data.data
  },

  async getWaiting(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined
    const { data } = await api.get('/my-work/waiting', { params })
    return data.data
  },
}

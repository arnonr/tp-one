import api from './api'
import type { Project } from '@/types'

export const projectService = {
  async list(filters?: { workspaceId?: string; status?: string; search?: string }): Promise<Project[]> {
    const params = new URLSearchParams()
    if (filters?.workspaceId) params.set('workspaceId', filters.workspaceId)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    const { data } = await api.get(`/projects${qs ? `?${qs}` : ''}`)
    return data.data
  },
}

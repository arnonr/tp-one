import api from './api'
import type { Project } from '@/types'

export interface ProjectListFilters {
  workspaceId?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export const projectService = {
  async list(filters?: ProjectListFilters): Promise<Project[]> {
    const params = new URLSearchParams()
    if (filters?.workspaceId) params.set('workspaceId', filters.workspaceId)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))
    const qs = params.toString()
    const { data } = await api.get(`/projects${qs ? `?${qs}` : ''}`)
    return data.data
  },

  async getById(id: string) {
    const { data } = await api.get(`/projects/${id}`)
    return data
  },

  async create(body: any) {
    const { data } = await api.post('/projects', body)
    return data.data
  },

  async update(id: string, body: any) {
    const { data } = await api.patch(`/projects/${id}`, body)
    return data.data
  },

  async delete(id: string) {
    await api.delete(`/projects/${id}`)
  },

  async recalculateProgress(id: string) {
    const { data } = await api.post(`/projects/${id}/recalculate-progress`)
    return data
  },

  // Members
  async getMembers(projectId: string) {
    const { data } = await api.get(`/projects/${projectId}/members`)
    return data.data
  },

  async addMember(projectId: string, userId: string, role?: string) {
    const { data } = await api.post(`/projects/${projectId}/members`, { userId, role })
    return data.data
  },

  async removeMember(projectId: string, userId: string) {
    await api.delete(`/projects/${projectId}/members/${userId}`)
  },

  // KPIs
  async getKpis(projectId: string) {
    const { data } = await api.get(`/projects/${projectId}/kpis`)
    return data.data
  },

  async createKpi(projectId: string, body: any) {
    const { data } = await api.post(`/projects/${projectId}/kpis`, body)
    return data.data
  },

  async updateKpi(projectId: string, kpiId: string, body: any) {
    const { data } = await api.patch(`/projects/${projectId}/kpis/${kpiId}`, body)
    return data.data
  },

  async deleteKpi(projectId: string, kpiId: string) {
    await api.delete(`/projects/${projectId}/kpis/${kpiId}`)
  },
}

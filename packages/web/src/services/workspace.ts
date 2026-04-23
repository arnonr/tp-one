import api from './api'
import type { Workspace, WorkspaceStatus, WorkspaceMemberRole } from '@/types'

export type { WorkspaceStatus }

export interface WorkspaceMember {
  userId: string
  role: WorkspaceMemberRole
  name: string
  email: string
  avatarUrl?: string | null
}

export const workspaceService = {
  async list(filters?: { type?: string; search?: string }): Promise<Workspace[]> {
    const params = new URLSearchParams()
    if (filters?.type) params.set('type', filters.type)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    const { data } = await api.get(`/workspaces${qs ? `?${qs}` : ''}`)
    return data.data
  },

  async getById(id: string): Promise<Workspace> {
    const { data } = await api.get(`/workspaces/${id}`)
    return data.data
  },

  async create(body: { name: string; type: string; color?: string; description?: string }): Promise<Workspace> {
    const { data } = await api.post('/workspaces', body)
    return data.data
  },

  async update(id: string, body: { name?: string; color?: string; description?: string }): Promise<Workspace> {
    const { data } = await api.patch(`/workspaces/${id}`, body)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`)
  },

  // Statuses
  async getStatuses(workspaceId: string): Promise<WorkspaceStatus[]> {
    const { data } = await api.get(`/workspaces/${workspaceId}/statuses`)
    return data.data
  },

  async createStatus(workspaceId: string, body: { name: string; statusType: string; color?: string; sortOrder?: string; isDefault?: boolean }): Promise<WorkspaceStatus> {
    const { data } = await api.post(`/workspaces/${workspaceId}/statuses`, body)
    return data.data
  },

  async updateStatus(statusId: string, body: { name?: string; statusType?: string; color?: string; sortOrder?: string; isDefault?: boolean }): Promise<WorkspaceStatus> {
    const { data } = await api.patch(`/workspaces/statuses/${statusId}`, body)
    return data.data
  },

  async deleteStatus(statusId: string): Promise<void> {
    await api.delete(`/workspaces/statuses/${statusId}`)
  },

  // Members
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data } = await api.get(`/workspaces/${workspaceId}/members`)
    return data.data
  },

  async addMember(workspaceId: string, userId: string, role: WorkspaceMemberRole): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/members`, { userId, role })
  },

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceMemberRole): Promise<void> {
    await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role })
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
  },
}

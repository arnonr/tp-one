import { WorkspaceService } from './workspace.service';
import type { JwtPayload } from '../../shared/types';
import type { WorkspaceCreateInput, WorkspaceUpdateInput, StatusCreateInput, StatusUpdateInput } from './workspace.service';
import type { WorkspacePermission } from '../../shared/constants';

export const WorkspaceController = {
  async list(user: JwtPayload, query: { type?: string; search?: string }) {
    const workspaces = await WorkspaceService.list(user.userId, user.role, {
      type: query.type,
      search: query.search,
    });
    return { success: true, data: workspaces };
  },

  async getById(user: JwtPayload, id: string) {
    const workspace = await WorkspaceService.getById(id, user.userId, user.role);
    return { success: true, data: workspace };
  },

  async create(user: JwtPayload, body: WorkspaceCreateInput) {
    const workspace = await WorkspaceService.create(body, user.userId);
    return { success: true, data: workspace };
  },

  async update(user: JwtPayload, id: string, body: WorkspaceUpdateInput) {
    const workspace = await WorkspaceService.update(id, body, user.userId, user.role);
    return { success: true, data: workspace };
  },

  async remove(user: JwtPayload, id: string) {
    await WorkspaceService.delete(id, user.userId, user.role);
    return { success: true };
  },

  // Statuses
  async getStatuses(user: JwtPayload, workspaceId: string) {
    const statuses = await WorkspaceService.getStatuses(workspaceId, user.userId, user.role);
    return { success: true, data: statuses };
  },

  async createStatus(user: JwtPayload, workspaceId: string, body: StatusCreateInput) {
    const status = await WorkspaceService.createStatus(workspaceId, body, user.userId, user.role);
    return { success: true, data: status };
  },

  async updateStatus(user: JwtPayload, statusId: string, body: StatusUpdateInput) {
    const status = await WorkspaceService.updateStatus(statusId, body, user.userId, user.role);
    return { success: true, data: status };
  },

  async deleteStatus(user: JwtPayload, statusId: string) {
    await WorkspaceService.deleteStatus(statusId, user.userId, user.role);
    return { success: true };
  },

  // Members
  async getMembers(user: JwtPayload, workspaceId: string) {
    const members = await WorkspaceService.getMembers(workspaceId, user.userId, user.role);
    return { success: true, data: members };
  },

  async addMember(user: JwtPayload, workspaceId: string, body: { userId: string; role: WorkspacePermission }) {
    await WorkspaceService.addMember(workspaceId, body.userId, body.role, user.userId, user.role);
    return { success: true };
  },

  async updateMember(user: JwtPayload, workspaceId: string, targetUserId: string, body: { role: WorkspacePermission }) {
    await WorkspaceService.updateMemberRole(workspaceId, targetUserId, body.role, user.userId, user.role);
    return { success: true };
  },

  async removeMember(user: JwtPayload, workspaceId: string, targetUserId: string) {
    await WorkspaceService.removeMember(workspaceId, targetUserId, user.userId, user.role);
    return { success: true };
  },
};

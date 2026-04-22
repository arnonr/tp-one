import { TaskService } from './task.service';
import { WaitingService } from './waiting.service';

export const TaskController = {
  async list(user: any, query: any) {
    const result = await TaskService.list(user.userId, user.role, {
      workspaceId: query.workspaceId,
      projectId: query.projectId,
      assigneeId: query.assigneeId,
      status: query.status,
      priority: query.priority,
      search: query.search,
      fiscalYear: query.fiscalYear ? Number(query.fiscalYear) : undefined,
      startDateFrom: query.startDateFrom,
      startDateTo: query.startDateTo,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
    return { success: true, ...result };
  },

  async getById(params: any) {
    const task = await TaskService.getById(params.id);
    return { success: true, data: task };
  },

  async create(user: any, body: any) {
    const task = await TaskService.create({
      ...body,
      reporterId: body.reporterId || user.userId,
    });
    return { success: true, data: task };
  },

  async update(user: any, params: any, body: any) {
    const task = await TaskService.update(params.id, body);
    return { success: true, data: task };
  },

  async remove(user: any, params: any) {
    await TaskService.delete(params.id);
    return { success: true };
  },

  // Subtasks
  async getSubtasks(params: any) {
    const subtasks = await TaskService.getSubtasks(params.id);
    return { success: true, data: subtasks };
  },

  // Tags
  async getTags(query: any) {
    const tagList = await TaskService.getWorkspaceTags(query.workspaceId);
    return { success: true, data: tagList };
  },

  async createTag(user: any, body: any) {
    const tag = await TaskService.createTag(body.workspaceId, body);
    return { success: true, data: tag };
  },

  async setTags(user: any, params: any, body: any) {
    await TaskService.setTaskTags(params.id, body.tagIds);
    return { success: true };
  },

  // Comments
  async getComments(params: any) {
    const commentList = await TaskService.getComments(params.id);
    return { success: true, data: commentList };
  },

  async addComment(user: any, params: any, body: any) {
    const comment = await TaskService.addComment(params.id, user.userId, body.content);
    return { success: true, data: comment };
  },

  async deleteComment(user: any, params: any) {
    await TaskService.deleteComment(params.commentId, user.userId, user.role);
    return { success: true };
  },

  // Batch
  async batchUpdateStatus(user: any, body: any) {
    await TaskService.batchUpdateStatus(body.updates);
    return { success: true };
  },

  // Waiting for others
  async getWaiting(params: any) {
    const list = await WaitingService.getByTaskId(params.id);
    return { success: true, data: list };
  },

  async setWaiting(user: any, params: any, body: any) {
    const waiting = await WaitingService.setWaiting({
      taskId: params.id,
      waitingFor: body.waitingFor,
      contactPerson: body.contactPerson,
      contactInfo: body.contactInfo,
      expectedDate: body.expectedDate,
    });
    return { success: true, data: waiting };
  },

  async resolveWaiting(user: any, params: any) {
    const result = await WaitingService.resolve(params.waitingId, user.userId);
    return result;
  },

  async addFollowUp(user: any, params: any, body: any) {
    const followUp = await WaitingService.addFollowUp({
      waitingId: params.waitingId,
      userId: user.userId,
      note: body.note,
    });
    return { success: true, data: followUp };
  },
};

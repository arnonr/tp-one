import { ProjectService } from './project.service';

export const ProjectController = {
  async list(query: any) {
    const result = await ProjectService.list({
      workspaceId: query.workspaceId,
      status: query.status,
      search: query.search,
      fiscalYear: query.fiscalYear ? Number(query.fiscalYear) : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
    return { success: true, ...result };
  },

  async getById(params: any) {
    const project = await ProjectService.getById(params.id);
    return { success: true, data: project };
  },

  async create(user: any, body: any) {
    const project = await ProjectService.create({
      ...body,
      ownerId: body.ownerId || user.userId,
    });
    return { success: true, data: project };
  },

  async update(user: any, params: any, body: any) {
    const project = await ProjectService.update(params.id, body);
    return { success: true, data: project };
  },

  async remove(user: any, params: any) {
    await ProjectService.delete(params.id);
    return { success: true };
  },

  // Members
  async getMembers(params: any) {
    const members = await ProjectService.getMembers(params.id);
    return { success: true, data: members };
  },

  async addMember(user: any, params: any, body: any) {
    const members = await ProjectService.addMember(params.id, body.userId, body.role || 'member');
    return { success: true, data: members };
  },

  async removeMember(user: any, params: any) {
    await ProjectService.removeMember(params.id, params.userId);
    return { success: true };
  },

  async updateMemberRole(user: any, params: any, body: any) {
    const members = await ProjectService.updateMemberRole(params.id, params.userId, body.role);
    return { success: true, data: members };
  },

  // Progress
  async recalculateProgress(params: any) {
    const result = await ProjectService.autoCalculateProgress(params.id);
    return { success: true, data: result };
  },

  // KPIs
  async getKpis(params: any) {
    const kpis = await ProjectService.getKpis(params.id);
    return { success: true, data: kpis };
  },

  async createKpi(user: any, params: any, body: any) {
    const kpi = await ProjectService.createKpi(user.userId, params.id, body);
    return { success: true, data: kpi };
  },

  async updateKpi(user: any, params: any, body: any) {
    const kpi = await ProjectService.updateKpi(user.userId, params.kpiId, body);
    return { success: true, data: kpi };
  },

  async deleteKpi(user: any, params: any) {
    await ProjectService.deleteKpi(user.userId, params.kpiId);
    return { success: true };
  },

  // KPI Audit Logs
  async getKpiAuditLogs(params: any) {
    const logs = await ProjectService.getKpiAuditLogs(params.kpiId);
    return { success: true, data: logs };
  },

  async revertKpi(user: any, params: any, body: any) {
    const kpi = await ProjectService.revertKpi(params.kpiId, user.userId, body.auditLogId, body.reason);
    return { success: true, data: kpi };
  },
};
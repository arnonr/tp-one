import { TemplateService } from './template.service';

export const TemplateController = {
  async list(query: any) {
    const templates = await TemplateService.list(query.workspaceId);
    return { success: true, data: templates };
  },

  async getById(params: any) {
    const template = await TemplateService.getById(params.id);
    return { success: true, data: template };
  },

  async create(user: any, body: any) {
    const template = await TemplateService.create({ ...body, createdBy: user.userId });
    return { success: true, data: template };
  },

  async update(user: any, params: any, body: any) {
    const template = await TemplateService.update(params.id, body);
    return { success: true, data: template };
  },

  async remove(user: any, params: any) {
    await TemplateService.delete(params.id);
    return { success: true };
  },

  async instantiate(user: any, params: any, body: any) {
    const created = await TemplateService.instantiate(params.id, {
      ...body,
      reporterId: user.userId,
    });
    return { success: true, data: created };
  },
};

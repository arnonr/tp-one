import { ProjectService } from './project.service';

export const ProjectController = {
  async list(query: any) {
    const data = await ProjectService.list({
      workspaceId: query.workspaceId,
      status: query.status,
      search: query.search,
    });
    return { success: true, data };
  },
};

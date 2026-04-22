import { db } from '../../config/database';
import { projects } from '../../db/schema';
import { eq, and, ilike, desc } from 'drizzle-orm';

export const ProjectService = {
  async list(filters?: { workspaceId?: string; status?: string; search?: string }) {
    const conditions = [];

    if (filters?.workspaceId) {
      conditions.push(eq(projects.workspaceId, filters.workspaceId));
    }
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(ilike(projects.name, `%${filters.search}%`));
    }

    return db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        name: projects.name,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        progress: projects.progress,
      })
      .from(projects)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(projects.createdAt));
  },
};

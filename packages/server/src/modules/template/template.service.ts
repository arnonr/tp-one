import { db } from '../../config/database';
import { taskTemplates, taskTemplateItems } from '../../db/schema/templates';
import { tasks } from '../../db/schema';
import { eq, isNull } from 'drizzle-orm';
import { NotFoundError } from '../../shared/errors';

export const TemplateService = {
  async list(workspaceId?: string) {
    const conditions = workspaceId
      ? eq(taskTemplates.workspaceId, workspaceId)
      : undefined;

    return db
      .select()
      .from(taskTemplates)
      .where(conditions)
      .orderBy(taskTemplates.name);
  },

  async getById(templateId: string) {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, templateId)).limit(1);
    if (!template) throw new NotFoundError('Template', templateId);

    const items = await db
      .select()
      .from(taskTemplateItems)
      .where(eq(taskTemplateItems.templateId, templateId))
      .orderBy(taskTemplateItems.sortOrder);

    return { ...template, items };
  },

  async create(data: { name: string; description?: string; workspaceId?: string; createdBy: string; items: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }> }) {
    const [template] = await db
      .insert(taskTemplates)
      .values({
        name: data.name,
        description: data.description,
        workspaceId: data.workspaceId,
        createdById: data.createdBy,
      })
      .returning();

    if (data.items?.length) {
      await db.insert(taskTemplateItems).values(
        data.items.map((item, index) => ({
          templateId: template.id,
          title: item.title,
          description: item.description,
          priority: item.priority || 'normal',
          sortOrder: item.sortOrder ?? index,
        })),
      );
    }

    return this.getById(template.id);
  },

  async update(templateId: string, data: { name?: string; description?: string; items?: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }> }) {
    const [existing] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, templateId)).limit(1);
    if (!existing) throw new NotFoundError('Template', templateId);

    await db
      .update(taskTemplates)
      .set({ name: data.name, description: data.description, updatedAt: new Date() })
      .where(eq(taskTemplates.id, templateId));

    if (data.items) {
      // Replace all items
      await db.delete(taskTemplateItems).where(eq(taskTemplateItems.templateId, templateId));
      if (data.items.length) {
        await db.insert(taskTemplateItems).values(
          data.items.map((item, index) => ({
            templateId,
            title: item.title,
            description: item.description,
            priority: item.priority || 'normal',
            sortOrder: item.sortOrder ?? index,
          })),
        );
      }
    }

    return this.getById(templateId);
  },

  async delete(templateId: string) {
    const [existing] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, templateId)).limit(1);
    if (!existing) throw new NotFoundError('Template', templateId);
    if (existing.isSystem) throw new NotFoundError('Cannot delete system template');

    await db.delete(taskTemplateItems).where(eq(taskTemplateItems.templateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
    return { success: true };
  },

  async instantiate(templateId: string, data: {
    workspaceId: string;
    projectId?: string;
    reporterId: string;
    assigneeId?: string;
  }) {
    const template = await this.getById(templateId);

    const createdTasks = [];
    for (const item of template.items) {
      const [task] = await db
        .insert(tasks)
        .values({
          title: item.title,
          description: item.description,
          workspaceId: data.workspaceId,
          projectId: data.projectId,
          priority: (item.priority || 'normal') as any,
          reporterId: data.reporterId,
          assigneeId: data.assigneeId,
          sortOrder: item.sortOrder || 0,
        })
        .returning();
      createdTasks.push(task);
    }

    return createdTasks;
  },
};

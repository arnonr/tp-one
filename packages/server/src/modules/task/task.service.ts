import { db } from '../../config/database';
import { tasks, taskAssignees, taskWatchers, tags, taskTags, comments, attachments, workspaceStatuses, workspaces, users, projects } from '../../db/schema';
import { eq, and, or, ilike, sql, desc, asc, count, isNull, lt, gte, lte, inArray } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors';
import { getWorkspacePermission } from '../../middleware/rbac.middleware';
import type { GlobalRole } from '../../shared/constants';
import type { TaskFilter } from '../../shared/types';

export const TaskService = {
  // --- Task CRUD ---

  async list(userId: string, userRole: GlobalRole, filters: TaskFilter = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.workspaceId) {
      conditions.push(eq(tasks.workspaceId, filters.workspaceId));
    }
    if (filters.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority as any));
    }
    if (filters.search) {
      conditions.push(ilike(tasks.title, `%${filters.search}%`));
    }
    if (filters.fiscalYear) {
      conditions.push(eq(tasks.fiscalYear, filters.fiscalYear));
    }

    // Only top-level tasks (no parent)
    conditions.push(isNull(tasks.parentId));

    const whereClause = and(...conditions);

    // Base query without assignee join
    const selectFields = {
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      statusId: tasks.statusId,
      statusName: workspaceStatuses.name,
      statusColor: workspaceStatuses.color,
      workspaceId: tasks.workspaceId,
      workspaceName: workspaces.name,
      workspaceType: workspaces.type,
      projectId: tasks.projectId,
      projectName: projects.name,
      reporterId: tasks.reporterId,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      fiscalYear: tasks.fiscalYear,
      budget: tasks.budget,
      estimatedHours: tasks.estimatedHours,
      sortOrder: tasks.sortOrder,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    };

    // If filtering by assignee, we need inner join on task_assignees
    let data;
    if (filters.assigneeId) {
      data = await db
        .select(selectFields)
        .from(tasks)
        .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
        .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
        .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(whereClause, eq(taskAssignees.userId, filters.assigneeId!)))
        .orderBy(desc(tasks.createdAt))
        .limit(pageSize)
        .offset(offset);
    } else {
      data = await db
        .select(selectFields)
        .from(tasks)
        .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
        .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(whereClause)
        .orderBy(desc(tasks.createdAt))
        .limit(pageSize)
        .offset(offset);
    }

    const [_, totalResult] = await Promise.all([
      Promise.resolve(null),
      db.select({ total: count() }).from(tasks).where(whereClause),
    ]);

    // Batch-load assignees for all tasks
    const taskIds = data.map((t) => t.id);
    const assigneesByTask: Record<string, Array<{ userId: string; name: string }>> = {};
    if (taskIds.length > 0) {
      const assigneeRows = await db
        .select({
          taskId: taskAssignees.taskId,
          userId: taskAssignees.userId,
          name: users.name,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(inArray(taskAssignees.taskId, taskIds));

      for (const row of assigneeRows) {
        if (!assigneesByTask[row.taskId]) assigneesByTask[row.taskId] = [];
        assigneesByTask[row.taskId].push({ userId: row.userId, name: row.name });
      }
    }

    const total = totalResult[0]?.total || 0;
    return {
      data: data.map((t) => ({
        ...t,
        assignees: assigneesByTask[t.id] || [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getById(taskId: string) {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        statusId: tasks.statusId,
        statusName: workspaceStatuses.name,
        statusColor: workspaceStatuses.color,
        workspaceId: tasks.workspaceId,
        workspaceName: workspaces.name,
        projectId: tasks.projectId,
        projectName: projects.name,
        reporterId: tasks.reporterId,
        fiscalYear: tasks.fiscalYear,
        budget: tasks.budget,
        estimatedHours: tasks.estimatedHours,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        sortOrder: tasks.sortOrder,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) throw new NotFoundError('Task', taskId);

    let reporterName: string | null = null;
    if (task.reporterId) {
      const [reporter] = await db.select({ name: users.name }).from(users).where(eq(users.id, task.reporterId)).limit(1);
      reporterName = reporter?.name ?? null;
    }

    const assignees = await db
      .select({ userId: taskAssignees.userId, name: users.name })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId));

    return { ...task, reporterName, assignees };
  },

  async create(data: {
    title: string;
    description?: string;
    workspaceId: string;
    projectId?: string;
    statusId?: string;
    priority?: string;
    assigneeIds?: string[];
    reporterId: string;
    fiscalYear?: number;
    budget?: string;
    estimatedHours?: string;
    startDate?: string;
    dueDate?: string;
    parentId?: string;
    tagIds?: string[];
  }) {
    const { assigneeIds, tagIds, ...taskData } = data;
    const [task] = await db
      .insert(tasks)
      .values({
        title: taskData.title,
        description: taskData.description,
        workspaceId: taskData.workspaceId,
        projectId: taskData.projectId,
        statusId: taskData.statusId,
        priority: (taskData.priority || 'normal') as any,
        reporterId: taskData.reporterId,
        fiscalYear: taskData.fiscalYear,
        budget: taskData.budget,
        estimatedHours: taskData.estimatedHours,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        parentId: taskData.parentId,
      })
      .returning();

    // Auto-add reporter as watcher
    await db.insert(taskWatchers).values({ taskId: task.id, userId: data.reporterId });

    // Add assignees
    if (assigneeIds?.length) {
      await db.insert(taskAssignees).values(
        assigneeIds.map((userId) => ({ taskId: task.id, userId }))
      );
    }

    // Add tags if provided
    if (tagIds?.length) {
      await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId: task.id, tagId })));
    }

    return this.getById(task.id);
  },

  async update(taskId: string, data: {
    title?: string;
    description?: string;
    statusId?: string;
    priority?: string;
    assigneeIds?: string[];
    fiscalYear?: number;
    budget?: string;
    estimatedHours?: string;
    startDate?: string;
    dueDate?: string;
    sortOrder?: number;
  }) {
    const existing = await this.getById(taskId);

    const { assigneeIds, ...updateData }: any = { ...data, updatedAt: new Date() };
    if (data.statusId) updateData.priority = data.priority as any;

    // If status changed to completed-like, set completedAt
    if (data.statusId && data.statusId !== existing.statusId) {
      const [newStatus] = await db.select().from(workspaceStatuses).where(eq(workspaceStatuses.id, data.statusId)).limit(1);
      if (newStatus?.name === 'เสร็จสิ้น' || newStatus?.name === 'สำเร็จ' || newStatus?.name === 'สรุปผล') {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));

    // Replace assignees if provided
    if (assigneeIds !== undefined) {
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      if (assigneeIds.length > 0) {
        await db.insert(taskAssignees).values(
          assigneeIds.map((userId) => ({ taskId, userId }))
        );
      }
    }

    return this.getById(taskId);
  },

  async delete(taskId: string) {
    // Delete related records
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
    await db.delete(taskWatchers).where(eq(taskWatchers.taskId, taskId));
    await db.delete(comments).where(eq(comments.taskId, taskId));
    await db.delete(attachments).where(eq(attachments.taskId, taskId));
    // Delete subtasks
    await db.delete(tasks).where(eq(tasks.parentId, taskId));
    await db.delete(tasks).where(eq(tasks.id, taskId));
    return { success: true };
  },

  // --- Subtasks ---

  async getSubtasks(taskId: string) {
    await this.getById(taskId); // verify parent exists
    return db.select().from(tasks).where(eq(tasks.parentId, taskId)).orderBy(asc(tasks.sortOrder));
  },

  // --- Tags ---

  async getWorkspaceTags(workspaceId: string) {
    return db.select().from(tags).where(eq(tags.workspaceId, workspaceId));
  },

  async createTag(workspaceId: string, data: { name: string; color?: string }) {
    const [tag] = await db.insert(tags).values({ workspaceId, name: data.name, color: data.color }).returning();
    return tag;
  },

  async setTaskTags(taskId: string, tagIds: string[]) {
    await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (tagIds.length) {
      await db.insert(taskTags).values(tagIds.map((tagId) => ({ taskId, tagId })));
    }
    return { success: true };
  },

  // --- Comments ---

  async getComments(taskId: string) {
    return db
      .select({
        id: comments.id,
        taskId: comments.taskId,
        userId: comments.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.taskId, taskId))
      .orderBy(asc(comments.createdAt));
  },

  async addComment(taskId: string, userId: string, content: string) {
    await this.getById(taskId); // verify task exists
    const [comment] = await db.insert(comments).values({ taskId, userId, content }).returning();
    return comment;
  },

  async deleteComment(commentId: string, userId: string, userRole: GlobalRole) {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!comment) throw new NotFoundError('Comment', commentId);
    if (comment.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Cannot delete this comment');
    }
    await db.delete(comments).where(eq(comments.id, commentId));
    return { success: true };
  },

  // --- Batch status update (for Kanban) ---

  async batchUpdateStatus(updates: Array<{ taskId: string; statusId: string; sortOrder?: number }>) {
    for (const u of updates) {
      const updateData: any = { statusId: u.statusId, updatedAt: new Date() };
      if (u.sortOrder !== undefined) updateData.sortOrder = u.sortOrder;

      // Check if new status is completion
      const [newStatus] = await db.select().from(workspaceStatuses).where(eq(workspaceStatuses.id, u.statusId)).limit(1);
      if (newStatus?.name === 'เสร็จสิ้น' || newStatus?.name === 'สำเร็จ' || newStatus?.name === 'สรุปผล') {
        updateData.completedAt = new Date();
      }

      await db.update(tasks).set(updateData).where(eq(tasks.id, u.taskId));
    }
    return { success: true };
  },
};

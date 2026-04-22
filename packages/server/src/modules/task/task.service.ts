import { db } from '../../config/database';
import { tasks, taskAssignees, taskWatchers, tags, taskTags, comments, attachments, workspaceStatuses, workspaces, users, projects } from '../../db/schema';
import { eq, and, or, ilike, sql, desc, asc, count, isNull, gte, lte, inArray, type SQL } from 'drizzle-orm';
import { notificationService } from '../../modules/notification/notification.service';
import { telegramService } from '../../modules/notification/telegram.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors';
import { getWorkspacePermission } from '../../middleware/rbac.middleware';
import { getFiscalYear } from '../../shared/thai.utils';
import type { GlobalRole } from '../../shared/constants';
import type { TaskFilter } from '../../shared/types';

async function getDefaultStatusId(workspaceId: string): Promise<string> {
  const [status] = await db
    .select({ id: workspaceStatuses.id })
    .from(workspaceStatuses)
    .where(eq(workspaceStatuses.workspaceId, workspaceId))
    .orderBy(workspaceStatuses.sortOrder)
    .limit(1);
  return status?.id ?? '';
}

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
    if (filters.status) {
      conditions.push(eq(tasks.statusId, filters.status));
    }
    if (filters.startDateFrom) {
      conditions.push(gte(tasks.startDate, filters.startDateFrom));
    }
    if (filters.startDateTo) {
      conditions.push(lte(tasks.startDate, filters.startDateTo));
    }
    if (filters.dueDateFrom) {
      conditions.push(gte(tasks.dueDate, filters.dueDateFrom));
    }
    if (filters.dueDateTo) {
      conditions.push(lte(tasks.dueDate, filters.dueDateTo));
    }

    // Only top-level tasks (no parent)
    conditions.push(isNull(tasks.parentId));

    const whereClause = and(...conditions);

    // Dynamic sorting
    const sortableColumns: Record<string, any> = {
      title: tasks.title,
      priority: tasks.priority,
      status: workspaceStatuses.name,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      fiscalYear: tasks.fiscalYear,
    };
    const sortCol = sortableColumns[filters.sortBy || ''] || tasks.createdAt;
    const sortDir = filters.sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

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
        .orderBy(sortDir)
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
        .orderBy(sortDir)
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

    // Batch-load subtask counts
    const subtaskCountByTask: Record<string, { total: number; done: number }> = {};
    if (taskIds.length > 0) {
      const subtaskRows = await db
        .select({
          parentId: tasks.parentId,
          total: count(),
          done: sql<number>`cast(count(case when ${tasks.completedAt} is not null then 1 end) as int)`,
        })
        .from(tasks)
        .where(inArray(tasks.parentId, taskIds))
        .groupBy(tasks.parentId);

      for (const row of subtaskRows) {
        if (row.parentId) {
          subtaskCountByTask[row.parentId] = { total: Number(row.total), done: Number(row.done) };
        }
      }
    }

    const total = totalResult[0]?.total || 0;
    return {
      data: data.map((t) => ({
        ...t,
        assignees: assigneesByTask[t.id] || [],
        subtaskCount: subtaskCountByTask[t.id]?.total || 0,
        completedSubtaskCount: subtaskCountByTask[t.id]?.done || 0,
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

    const taskTagsList = await db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, taskId));

    return { ...task, reporterName, assignees, tags: taskTagsList };
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

    // Resolve defaults: fiscalYear and statusId
    const [fiscalYearToUse, statusIdToUse] = await Promise.all([
      taskData.fiscalYear ? Promise.resolve(taskData.fiscalYear) : Promise.resolve(getFiscalYear(new Date())),
      taskData.statusId ? Promise.resolve(taskData.statusId) : getDefaultStatusId(taskData.workspaceId),
    ]);

    const [task] = await db
      .insert(tasks)
      .values({
        title: taskData.title,
        description: taskData.description,
        workspaceId: taskData.workspaceId,
        projectId: taskData.projectId,
        statusId: statusIdToUse,
        priority: (taskData.priority || 'normal') as any,
        reporterId: taskData.reporterId,
        fiscalYear: fiscalYearToUse,
        budget: taskData.budget,
        estimatedHours: taskData.estimatedHours,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        parentId: taskData.parentId,
      })
      .returning();

    // Auto-add reporter as watcher and assignee
    await db.insert(taskWatchers).values({ taskId: task.id, userId: data.reporterId });
    await db.insert(taskAssignees).values({ taskId: task.id, userId: data.reporterId });

    // Add assignees
    if (assigneeIds?.length) {
      // Avoid duplicate if reporter is also in assigneeIds
      const uniqueAssignees = assigneeIds.filter(id => id !== data.reporterId);
      if (uniqueAssignees.length) {
        await db.insert(taskAssignees).values(
          uniqueAssignees.map((userId) => ({ taskId: task.id, userId }))
        );
      }
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
    completedAt?: string | null;
    sortOrder?: number;
  }) {
    const existing = await this.getById(taskId);

    const { assigneeIds, ...updateData }: any = { ...data, updatedAt: new Date() };
    if (data.statusId) updateData.priority = data.priority as any;

    // Convert timestamp strings to Date objects for Drizzle
    if (updateData.completedAt !== undefined) {
      updateData.completedAt = updateData.completedAt ? new Date(updateData.completedAt) : null;
    }

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

    // Get commenter info
    const [commenter] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

    // Get task info for notifications
    const task = await this.getById(taskId);

    // Parse @mentions and notify mentioned users
    const mentionedNames = this.parseMentions(content);
    if (mentionedNames.length > 0) {
      await this.notifyMentionedUsers(taskId, task.title, mentionedNames, commenter?.name || 'Someone', userId);
    }

    // Notify task watchers
    await this.notifyTaskWatchers(taskId, task.title, commenter?.name || 'Someone', content);

    return comment;
  },

  async updateComment(commentId: string, userId: string, userRole: GlobalRole, content: string) {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!comment) throw new NotFoundError('Comment', commentId);
    if (comment.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Cannot edit this comment');
    }

    const [updated] = await db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning();

    return updated;
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

  // --- @mention helpers ---

  parseMentions(content: string): string[] {
    const mentionRegex = /@([฀-๿a-zA-Z\s]+?)(?:\s|$|[.,!?;:])/g;
    const matches = content.matchAll(mentionRegex);
    const names: string[] = [];
    for (const match of matches) {
      const name = match[1].trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
    return names;
  },

  async notifyMentionedUsers(taskId: string, taskTitle: string, mentionedNames: string[], commenterName: string, commenterId: string) {
    // Find users by their display names
    for (const name of mentionedNames) {
      const [mentionedUser] = await db
        .select({ id: users.id, telegramChatId: users.telegramChatId })
        .from(users)
        .where(ilike(users.name, `%${name}%`))
        .limit(1);

      if (mentionedUser && mentionedUser.id !== commenterId) {
        const { notificationService } = await import('../../modules/notification/notification.service');

        // Create in-app notification
        await notificationService.createNotification({
          userId: mentionedUser.id,
          type: 'mention',
          title: `คุณถูกกล่าวถึงใน: ${taskTitle}`,
          message: `${commenterName} กล่าวถึงคุณในความคิดเห็น`,
          entityType: 'task',
          entityId: taskId,
        });

        // Send Telegram notification if configured
        if (mentionedUser.telegramChatId) {
          const { telegramService } = await import('../../modules/notification/telegram.service');
          const truncatedTitle = taskTitle.length > 100 ? taskTitle.substring(0, 100) + '...' : taskTitle;
          await telegramService.sendToUser(
            mentionedUser.telegramChatId,
            `📢 *ถูกกล่าวถึง!*\n\n📌 งาน: ${truncatedTitle}\n👤 ${commenterName} กล่าวถึงคุณในความคิดเห็น\n\n🤖 ส่งโดย TP-One Bot`
          );
        }
      }
    }
  },

  async notifyTaskWatchers(taskId: string, taskTitle: string, commenterName: string, commentText: string) {
    // Get all watchers except the commenter
    const watchers = await db
      .select({ userId: taskWatchers.userId })
      .from(taskWatchers)
      .where(eq(taskWatchers.taskId, taskId));

    for (const watcher of watchers) {
      // Get user's telegram ID
      const [user] = await db
        .select({ telegramChatId: users.telegramChatId })
        .from(users)
        .where(eq(users.id, watcher.userId))
        .limit(1);

      const { notificationService } = await import('../../modules/notification/notification.service');
      await notificationService.notifyTaskComment({
        userId: watcher.userId,
        userTelegramId: user?.telegramChatId,
        taskTitle,
        commenterName,
        commentText,
      });
    }
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

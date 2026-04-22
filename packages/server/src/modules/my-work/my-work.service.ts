import { db } from '../../config/database';
import { tasks, workspaceStatuses, users, workspaces, taskAssignees } from '../../db/schema';
import { taskWaiting } from '../../db/schema/waiting';
import { eq, and, isNull, sql, desc, type SQL } from 'drizzle-orm';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function endOfWeekStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function workspaceFilter(workspaceId?: string): SQL | undefined {
  if (!workspaceId) return undefined;
  return eq(tasks.workspaceId, workspaceId);
}

const taskFields = {
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
  assigneeId: taskAssignees.userId,
  assigneeName: users.name,
  reporterId: tasks.reporterId,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
  completedAt: tasks.completedAt,
  sortOrder: tasks.sortOrder,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

export const MyWorkService = {
  async getSummary(userId: string, workspaceId?: string) {
    const today = todayStr();
    const wf = workspaceFilter(workspaceId);

    const [todayTasks, overdueTasks, weekTasks, waitingTasks] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(and(
          eq(taskAssignees.userId, userId),
          isNull(tasks.completedAt),
          eq(tasks.dueDate, today),
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(and(
          eq(taskAssignees.userId, userId),
          isNull(tasks.completedAt),
          sql`${tasks.dueDate} < ${today}`,
          sql`${tasks.dueDate} IS NOT NULL`,
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(and(
          eq(taskAssignees.userId, userId),
          isNull(tasks.completedAt),
          sql`${tasks.dueDate} <= ${endOfWeekStr()}`,
          sql`${tasks.dueDate} > ${today}`,
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(taskWaiting)
        .innerJoin(tasks, eq(taskWaiting.taskId, tasks.id))
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(and(
          eq(taskAssignees.userId, userId),
          eq(taskWaiting.isResolved, false),
          wf,
        )),
    ]);

    return {
      today: todayTasks[0]?.count || 0,
      overdue: overdueTasks[0]?.count || 0,
      thisWeek: weekTasks[0]?.count || 0,
      waiting: waitingTasks[0]?.count || 0,
    };
  },

  async getToday(userId: string, workspaceId?: string) {
    return db
      .select(taskFields)
      .from(tasks)
      .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(and(
        eq(taskAssignees.userId, userId),
        isNull(tasks.completedAt),
        eq(tasks.dueDate, todayStr()),
        workspaceFilter(workspaceId),
      ))
      .orderBy(desc(tasks.priority), desc(tasks.createdAt));
  },

  async getOverdue(userId: string, workspaceId?: string) {
    return db
      .select(taskFields)
      .from(tasks)
      .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(and(
        eq(taskAssignees.userId, userId),
        isNull(tasks.completedAt),
        sql`${tasks.dueDate} < ${todayStr()}`,
        sql`${tasks.dueDate} IS NOT NULL`,
        workspaceFilter(workspaceId),
      ))
      .orderBy(tasks.dueDate);
  },

  async getUpcoming(userId: string, workspaceId?: string) {
    const today = todayStr();
    const endOfWeek = endOfWeekStr();
    return db
      .select(taskFields)
      .from(tasks)
      .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(and(
        eq(taskAssignees.userId, userId),
        isNull(tasks.completedAt),
        sql`${tasks.dueDate} > ${today}`,
        sql`${tasks.dueDate} <= ${endOfWeek}`,
        workspaceFilter(workspaceId),
      ))
      .orderBy(tasks.dueDate);
  },

  async getWaiting(userId: string, workspaceId?: string) {
    return db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskPriority: tasks.priority,
        workspaceName: workspaces.name,
        waitingFor: taskWaiting.waitingFor,
        expectedDate: taskWaiting.expectedDate,
        waitingSince: taskWaiting.createdAt,
      })
      .from(taskWaiting)
      .innerJoin(tasks, eq(taskWaiting.taskId, tasks.id))
      .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(
        eq(taskAssignees.userId, userId),
        eq(taskWaiting.isResolved, false),
        workspaceFilter(workspaceId),
      ))
      .orderBy(taskWaiting.expectedDate);
  },

  async getAll(userId: string, workspaceId?: string) {
    const [summary, today, overdue, upcoming, waiting] = await Promise.all([
      this.getSummary(userId, workspaceId),
      this.getToday(userId, workspaceId),
      this.getOverdue(userId, workspaceId),
      this.getUpcoming(userId, workspaceId),
      this.getWaiting(userId, workspaceId),
    ]);

    return { summary, today, overdue, upcoming, waiting };
  },
};

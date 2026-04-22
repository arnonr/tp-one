import { db } from '../../config/database';
import { tasks, workspaceStatuses, workspaces, taskAssignees } from '../../db/schema';
import { taskWaiting } from '../../db/schema/waiting';
import { eq, and, isNull, sql, desc, type SQL } from 'drizzle-orm';

function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function endOfWeekStr() {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const day = bangkokNow.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  bangkokNow.setDate(bangkokNow.getDate() + diff);
  return bangkokNow.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function workspaceFilter(workspaceId?: string): SQL | undefined {
  if (!workspaceId) return undefined;
  return eq(tasks.workspaceId, workspaceId);
}

function myTaskCondition(userId: string) {
  return sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${tasks.id} AND user_id = ${userId})`;
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
    const endOfWeek = endOfWeekStr();
    const wf = workspaceFilter(workspaceId);

    const [todayTasks, overdueTasks, weekTasks, waitingTasks] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(
          myTaskCondition(userId),
          isNull(tasks.completedAt),
          eq(tasks.dueDate, today),
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(
          myTaskCondition(userId),
          isNull(tasks.completedAt),
          sql`${tasks.dueDate} < ${today}`,
          sql`${tasks.dueDate} IS NOT NULL`,
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(
          myTaskCondition(userId),
          isNull(tasks.completedAt),
          sql`${tasks.dueDate} > ${today}`,
          sql`${tasks.dueDate} <= ${endOfWeek}`,
          wf,
        )),
      db.select({ count: sql<number>`count(*)::int` })
        .from(taskWaiting)
        .innerJoin(tasks, eq(taskWaiting.taskId, tasks.id))
        .where(and(
          myTaskCondition(userId),
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
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(
        myTaskCondition(userId),
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
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(
        myTaskCondition(userId),
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
      .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(
        myTaskCondition(userId),
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
      .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
      .where(and(
        myTaskCondition(userId),
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

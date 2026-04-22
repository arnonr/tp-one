import { db } from '../../config/database';
import { tasks, workspaceStatuses, users, workspaces } from '../../db/schema';
import { taskWaiting } from '../../db/schema/waiting';
import { eq, and, lte, gte, isNull, sql, desc } from 'drizzle-orm';

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

function endOfMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split('T')[0];
}

const taskSelect = {
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
  assigneeId: tasks.assigneeId,
  assigneeName: users.name,
  reporterId: tasks.reporterId,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
  completedAt: tasks.completedAt,
  sortOrder: tasks.sortOrder,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

const taskJoin = () =>
  db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(workspaceStatuses, eq(tasks.statusId, workspaceStatuses.id))
    .leftJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id));

export const MyWorkService = {
  async getSummary(userId: string) {
    const today = todayStr();

    const [todayTasks, overdueTasks, weekTasks, waitingTasks] = await Promise.all([
      // Tasks due today
      db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
        and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), eq(tasks.dueDate, today)),
      ),
      // Overdue tasks
      db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
        and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), sql`${tasks.dueDate} < ${today}`, sql`${tasks.dueDate} IS NOT NULL`),
      ),
      // Tasks due this week
      db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
        and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), sql`${tasks.dueDate} <= ${endOfWeekStr()}`, sql`${tasks.dueDate} >= ${today}`),
      ),
      // Waiting for others
      db.select({ count: sql<number>`count(*)::int` })
        .from(taskWaiting)
        .innerJoin(tasks, eq(taskWaiting.taskId, tasks.id))
        .where(and(eq(tasks.assigneeId, userId), eq(taskWaiting.isResolved, false))),
    ]);

    return {
      today: todayTasks[0]?.count || 0,
      overdue: overdueTasks[0]?.count || 0,
      thisWeek: weekTasks[0]?.count || 0,
      waiting: waitingTasks[0]?.count || 0,
    };
  },

  async getToday(userId: string) {
    const today = todayStr();
    return taskJoin()
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), eq(tasks.dueDate, today)))
      .orderBy(desc(tasks.priority), desc(tasks.createdAt));
  },

  async getOverdue(userId: string) {
    const today = todayStr();
    return taskJoin()
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), sql`${tasks.dueDate} < ${today}`, sql`${tasks.dueDate} IS NOT NULL`))
      .orderBy(tasks.dueDate);
  },

  async getUpcoming(userId: string) {
    const today = todayStr();
    const endOfWeek = endOfWeekStr();
    return taskJoin()
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), sql`${tasks.dueDate} > ${today}`, sql`${tasks.dueDate} <= ${endOfWeek}`))
      .orderBy(tasks.dueDate);
  },

  async getWaiting(userId: string) {
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
      .where(and(eq(tasks.assigneeId, userId), eq(taskWaiting.isResolved, false)))
      .orderBy(taskWaiting.expectedDate);
  },

  async getAll(userId: string) {
    const [summary, today, overdue, upcoming, waiting] = await Promise.all([
      this.getSummary(userId),
      this.getToday(userId),
      this.getOverdue(userId),
      this.getUpcoming(userId),
      this.getWaiting(userId),
    ]);

    return { summary, today, overdue, upcoming, waiting };
  },
};

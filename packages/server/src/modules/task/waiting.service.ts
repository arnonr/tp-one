import { db } from '../../config/database';
import { taskWaiting, taskFollowUps } from '../../db/schema/waiting';
import { tasks } from '../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { NotFoundError } from '../../shared/errors';

export const WaitingService = {
  async setWaiting(data: {
    taskId: string;
    waitingFor: string;
    contactPerson?: string;
    contactInfo?: string;
    expectedDate?: string;
  }) {
    const [waiting] = await db
      .insert(taskWaiting)
      .values({
        taskId: data.taskId,
        waitingFor: data.waitingFor,
        contactPerson: data.contactPerson,
        contactInfo: data.contactInfo,
        expectedDate: data.expectedDate,
      })
      .returning();
    return waiting;
  },

  async getByTaskId(taskId: string) {
    return db
      .select({
        id: taskWaiting.id,
        taskId: taskWaiting.taskId,
        waitingFor: taskWaiting.waitingFor,
        contactPerson: taskWaiting.contactPerson,
        contactInfo: taskWaiting.contactInfo,
        expectedDate: taskWaiting.expectedDate,
        isResolved: taskWaiting.isResolved,
        resolvedAt: taskWaiting.resolvedAt,
        createdAt: taskWaiting.createdAt,
      })
      .from(taskWaiting)
      .where(eq(taskWaiting.taskId, taskId))
      .orderBy(taskWaiting.createdAt);
  },

  async getActiveByUser(userId: string) {
    // Get all tasks assigned to user that have active (unresolved) waiting
    return db
      .select({
        waitingId: taskWaiting.id,
        taskId: tasks.id,
        taskTitle: tasks.title,
        waitingFor: taskWaiting.waitingFor,
        expectedDate: taskWaiting.expectedDate,
        waitingSince: taskWaiting.createdAt,
      })
      .from(taskWaiting)
      .innerJoin(tasks, eq(taskWaiting.taskId, tasks.id))
      .where(and(eq(tasks.assigneeId, userId), eq(taskWaiting.isResolved, false)));
  },

  async resolve(waitingId: string, userId: string) {
    const [existing] = await db.select().from(taskWaiting).where(eq(taskWaiting.id, waitingId)).limit(1);
    if (!existing) throw new NotFoundError('Waiting record', waitingId);

    await db
      .update(taskWaiting)
      .set({ isResolved: true, resolvedAt: new Date(), resolvedBy: userId, updatedAt: new Date() })
      .where(eq(taskWaiting.id, waitingId));
    return { success: true };
  },

  async addFollowUp(data: { waitingId: string; userId: string; note?: string }) {
    const [existing] = await db.select().from(taskWaiting).where(eq(taskWaiting.id, data.waitingId)).limit(1);
    if (!existing) throw new NotFoundError('Waiting record', data.waitingId);

    const [followUp] = await db
      .insert(taskFollowUps)
      .values({ waitingId: data.waitingId, userId: data.userId, note: data.note })
      .returning();
    return followUp;
  },

  async getFollowUps(waitingId: string) {
    return db.select().from(taskFollowUps).where(eq(taskFollowUps.waitingId, waitingId));
  },
};

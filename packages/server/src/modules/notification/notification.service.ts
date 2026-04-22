import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../../config/database';
import { notifications, userNotificationSettings } from '../../db/schema';
import { telegramService } from './telegram.service';
import type { Notification, NotificationType, NotificationSettings } from './notification.types';

export class NotificationService {
  async getNotifications(
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      isRead?: boolean;
      entityType?: string;
    } = {}
  ): Promise<{ data: Notification[]; total: number }> {
    const { page = 1, pageSize = 20, isRead, entityType } = options;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(notifications.userId, userId)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    if (entityType) {
      conditions.push(eq(notifications.entityType, entityType));
    }

    const [totalResult] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(...conditions));

    const data = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data, total: totalResult?.count ?? 0 };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });
    return !!result;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.rowCount ?? 0;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });
    return !!result;
  }

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    entityType?: string;
    entityId?: string;
  }): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
      })
      .returning();
    return notification;
  }

  async notifyTaskAssigned(params: {
    userId: string;
    userTelegramId?: string;
    taskTitle: string;
    workspaceName: string;
    assigneeName: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'task_assigned',
      title: `งานใหม่: ${params.taskTitle}`,
      message: `คุณได้รับมอบหมายงาน "${params.taskTitle}" ใน${params.workspaceName}`,
      entityType: 'task',
    });

    if (params.userTelegramId && telegramService.isConfigured) {
      await telegramService.sendTaskAssigned(
        params.userTelegramId,
        params.taskTitle,
        params.workspaceName,
        params.assigneeName
      );
    }
  }

  async notifyTaskStatusChanged(params: {
    userId: string;
    userTelegramId?: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    changedByName: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'task_status_changed',
      title: `สถานะงานเปลี่ยน: ${params.taskTitle}`,
      message: `งาน "${params.taskTitle}" เปลี่ยนจาก "${params.oldStatus}" เป็น "${params.newStatus}" โดย ${params.changedByName}`,
      entityType: 'task',
    });

    if (params.userTelegramId && telegramService.isConfigured) {
      await telegramService.sendTaskStatusChanged(
        params.userTelegramId,
        params.taskTitle,
        params.oldStatus,
        params.newStatus,
        params.changedByName
      );
    }
  }

  async notifyTaskComment(params: {
    userId: string;
    userTelegramId?: string;
    taskTitle: string;
    commenterName: string;
    commentText: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'task_comment',
      title: `ความคิดเห็นใหม่: ${params.taskTitle}`,
      message: `${params.commenterName}: ${params.commentText.substring(0, 100)}`,
      entityType: 'task',
    });

    if (params.userTelegramId && telegramService.isConfigured) {
      await telegramService.sendTaskComment(
        params.userTelegramId,
        params.taskTitle,
        params.commenterName,
        params.commentText
      );
    }
  }

  async notifyDeadlineApproaching(params: {
    userId: string;
    userTelegramId?: string;
    taskTitle: string;
    dueDate: Date;
    daysLeft: number;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'task_due_soon',
      title: `เตือนกำหนดส่ง: ${params.taskTitle}`,
      message: `งาน "${params.taskTitle}" กำหนดส่งในอีก ${params.daysLeft} วัน`,
      entityType: 'task',
    });

    if (params.userTelegramId && telegramService.isConfigured) {
      await telegramService.sendDeadlineApproaching(
        params.userTelegramId,
        params.taskTitle,
        params.dueDate,
        params.daysLeft
      );
    }
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const [settings] = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId))
      .limit(1);
    return settings ?? null;
  }

  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const [result] = await db
      .insert(userNotificationSettings)
      .values({
        userId,
        ...settings,
      })
      .onConflict(userNotificationSettings.userId)
      .merge(settings)
      .returning();
    return result;
  }
}

export const notificationService = new NotificationService();
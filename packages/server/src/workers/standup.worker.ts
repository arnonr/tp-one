import { db } from '../config/database';
import { tasks, users, userNotificationSettings } from '../db/schema';
import { eq, and, lte, gte, lt } from 'drizzle-orm';
import { notificationService } from '../modules/notification/notification.service';
import { telegramService } from '../modules/notification/telegram.service';
import { getCurrentFiscalYear, getFiscalYearRange } from '../shared/thai.utils';

interface StandupUserData {
  userId: string;
  userName: string;
  telegramId: string | null;
  todayTasks: number;
  overdueTasks: number;
  weekTasks: number;
  waitingTasks: number;
  subtaskTotal: number;
  subtaskCompleted: number;
  taskDetails: string[];
}

export async function runDailyStandup(): Promise<void> {
  console.log('[StandupWorker] Starting daily standup...');

  const now = new Date();
  const currentFY = getCurrentFiscalYear();
  const fyRange = getFiscalYearRange(currentFY);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Get all users with their notification settings
  const allUsers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      telegramChatId: users.telegramChatId,
    })
    .from(users);

  for (const user of allUsers) {
    const todayTasksResult = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, user.id),
          gte(tasks.dueDate, todayStart),
          lt(tasks.dueDate, todayEnd)
        )
      );

    const overdueTasksResult = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, user.id),
          lt(tasks.dueDate, todayStart)
        )
      );

    const weekTasksResult = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, user.id),
          gte(tasks.dueDate, todayStart),
          lt(tasks.dueDate, weekEnd)
        )
      );

    const waitingTasksResult = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(eq(tasks.assigneeId, user.id), eq(tasks.status, 'waiting'))
      );

    // Get subtask progress for this user (subtasks are tasks with parentId)
    const allUserSubtasks = await db
      .select({ id: tasks.id, completedAt: tasks.completedAt })
      .from(tasks)
      .where(eq(tasks.assigneeId, user.id));

    const userSubtaskIds = allUserSubtasks.map(st => st.id);
    const subtaskTotal = userSubtaskIds.length;
    const subtaskCompleted = allUserSubtasks.filter(st => st.completedAt !== null).length;

    const standupData: StandupUserData = {
      userId: user.id,
      userName: user.displayName,
      telegramId: user.telegramChatId ?? null,
      todayTasks: todayTasksResult.length,
      overdueTasks: overdueTasksResult.length,
      weekTasks: weekTasksResult.length,
      waitingTasks: waitingTasksResult.length,
      subtaskTotal,
      subtaskCompleted,
      taskDetails: todayTasksResult.map((t) => t.title),
    };

    // Send to user via in-app notification
    await notificationService.createNotification({
      userId: user.id,
      type: 'system',
      title: 'สรุปงานประจำวัน',
      message: `วันนี้: ${standupData.todayTasks} งาน, เลยกำหนด: ${standupData.overdueTasks} งาน, สัปดาห์นี้: ${standupData.weekTasks} งาน, งานย่อย: ${subtaskCompleted}/${subtaskTotal} งาน`,
    });

    // Send via Telegram if configured
    if (standupData.telegramId && telegramService.isConfigured) {
      await telegramService.sendDailyStandup(standupData.telegramId, standupData);
    }
  }

  console.log('[StandupWorker] Daily standup completed');
}

export async function runDeadlineReminders(): Promise<void> {
  console.log('[NotificationWorker] Checking for deadline reminders...');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Find tasks due tomorrow
  const tasksDueTomorrow = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, tomorrowStart),
        lt(tasks.dueDate, tomorrowEnd)
      )
    );

  for (const task of tasksDueTomorrow) {
    const [assignee] = await db
      .select({ displayName: users.displayName, telegramChatId: users.telegramChatId })
      .from(users)
      .where(eq(users.id, task.assigneeId));

    if (assignee) {
      await notificationService.notifyDeadlineApproaching({
        userId: task.assigneeId,
        userTelegramId: assignee.telegramChatId ?? undefined,
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysLeft: 1,
      });
    }
  }

  // Find tasks due in 3 days
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysLaterStart = new Date(threeDaysLater.getFullYear(), threeDaysLater.getMonth(), threeDaysLater.getDate());
  const threeDaysLaterEnd = new Date(threeDaysLaterStart);
  threeDaysLaterEnd.setDate(threeDaysLaterEnd.getDate() + 1);

  const tasksDueInThreeDays = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(
      and(
        gte(tasks.dueDate, threeDaysLaterStart),
        lt(tasks.dueDate, threeDaysLaterEnd)
      )
    );

  for (const task of tasksDueInThreeDays) {
    const [assignee] = await db
      .select({ displayName: users.displayName, telegramChatId: users.telegramChatId })
      .from(users)
      .where(eq(users.id, task.assigneeId));

    if (assignee) {
      await notificationService.notifyDeadlineApproaching({
        userId: task.assigneeId,
        userTelegramId: assignee.telegramChatId ?? undefined,
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysLeft: 3,
      });
    }
  }

  console.log('[NotificationWorker] Deadline reminders completed');
}

// Cron schedule: run at 08:30 every day (Bangkok timezone)
export const STANDUP_CRON = '30 8 * * *';
export const DEADLINE_REMINDER_CRON = '0 9 * * *';
import Elysia from 'elysia';
import { notificationService } from './notification.service';
import { authMiddleware } from '../../middleware/auth.middleware';

export const notificationPlugin = new Elysia({ prefix: '/api/notifications' })
  .onBeforeHandle(authMiddleware())
  .get('/', async ({ user, query }) => {
    const page = query?.page ? parseInt(query.page as string) : 1;
    const pageSize = query?.pageSize ? parseInt(query.pageSize as string) : 20;
    const isRead = query?.isRead === 'true' ? true : query?.isRead === 'false' ? false : undefined;
    const entityType = query?.entityType as string | undefined;

    const result = await notificationService.getNotifications(user.userId, {
      page,
      pageSize,
      isRead,
      entityType,
    });

    return {
      success: true,
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  })
  .get('/unread-count', async ({ user }) => {
    const count = await notificationService.getUnreadCount(user.userId);
    return { success: true, data: count };
  })
  .patch('/:id/read', async ({ params, user }) => {
    const success = await notificationService.markAsRead(params.id as string, user.userId);
    return { success };
  })
  .patch('/read-all', async ({ user }) => {
    const count = await notificationService.markAllAsRead(user.userId);
    return { success: true, data: { markedAsRead: count } };
  })
  .delete('/:id', async ({ params, user }) => {
    const success = await notificationService.deleteNotification(params.id as string, user.userId);
    return { success };
  })
  .get('/settings', async ({ user }) => {
    const settings = await notificationService.getNotificationSettings(user.userId);
    return { success: true, data: settings };
  })
  .put('/settings', async ({ body, user }) => {
    const settings = await notificationService.updateNotificationSettings(
      user.userId,
      body as Record<string, unknown>
    );
    return { success: true, data: settings };
  });
import Elysia, { t } from 'elysia';
import { MyWorkService } from './my-work.service';
import { authMiddleware } from '../../middleware/auth.middleware';

export const myWorkPlugin = new Elysia({ prefix: '/api/my-work' })
  .onBeforeHandle(authMiddleware())

  .get('/', async ({ user, query }) => {
    const data = await MyWorkService.getAll(user.userId, query.workspaceId as string | undefined);
    return { success: true, data };
  }, {
    query: t.Object({
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'Get all my work grouped by deadline' },
  })

  .get('/summary', async ({ user, query }) => {
    const data = await MyWorkService.getSummary(user.userId, query.workspaceId as string | undefined);
    return { success: true, data };
  }, {
    query: t.Object({
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'Get my work summary counts' },
  })

  .get('/today', async ({ user, query }) => {
    const data = await MyWorkService.getToday(user.userId, query.workspaceId as string | undefined);
    return { success: true, data };
  }, {
    query: t.Object({
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'Get tasks due today' },
  })

  .get('/overdue', async ({ user, query }) => {
    const data = await MyWorkService.getOverdue(user.userId, query.workspaceId as string | undefined);
    return { success: true, data };
  }, {
    query: t.Object({
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'Get overdue tasks' },
  })

  .get('/waiting', async ({ user, query }) => {
    const data = await MyWorkService.getWaiting(user.userId, query.workspaceId as string | undefined);
    return { success: true, data };
  }, {
    query: t.Object({
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'Get tasks waiting for others' },
  });

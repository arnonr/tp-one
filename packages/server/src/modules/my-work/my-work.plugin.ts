import Elysia from 'elysia';
import { MyWorkService } from './my-work.service';
import { authMiddleware } from '../../middleware/auth.middleware';

export const myWorkPlugin = new Elysia({ prefix: '/api/my-work' })
  .onBeforeHandle(authMiddleware())

  .get('/', async ({ user }) => {
    const data = await MyWorkService.getAll(user.userId);
    return { success: true, data };
  }, {
    detail: { summary: 'Get all my work grouped by deadline' },
  })

  .get('/summary', async ({ user }) => {
    const data = await MyWorkService.getSummary(user.userId);
    return { success: true, data };
  }, {
    detail: { summary: 'Get my work summary counts' },
  })

  .get('/today', async ({ user }) => {
    const data = await MyWorkService.getToday(user.userId);
    return { success: true, data };
  }, {
    detail: { summary: 'Get tasks due today' },
  })

  .get('/overdue', async ({ user }) => {
    const data = await MyWorkService.getOverdue(user.userId);
    return { success: true, data };
  }, {
    detail: { summary: 'Get overdue tasks' },
  })

  .get('/waiting', async ({ user }) => {
    const data = await MyWorkService.getWaiting(user.userId);
    return { success: true, data };
  }, {
    detail: { summary: 'Get tasks waiting for others' },
  });

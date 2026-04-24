import { Elysia } from 'elysia';
import { planController } from './plan.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const planPlugin = new Elysia({ prefix: '/api/plans' })
  .onBeforeHandle(authMiddleware())

  // Plans
  .get('/', async ({ user, query }) => planController.list(user, query as any), {
    detail: { summary: 'List plans' },
  })
  .get('/:planId', async ({ user, params }) => planController.getById(user, params), {
    detail: { summary: 'Get plan by ID' },
  })
  .post('/', async ({ user, body }) => planController.create(user, body as any), {
    detail: { summary: 'Create plan' },
  })
  .patch('/:planId', async ({ user, params, body }) => planController.update(user, params, body as any), {
    detail: { summary: 'Update plan' },
  })
  .delete('/:planId', async ({ user, params }) => planController.delete(user, params), {
    detail: { summary: 'Delete plan' },
  })

  // Categories (nested under plan)
  .get('/:planId/categories', async ({ user, params }) => planController.getCategories(user, params), {
    detail: { summary: 'List categories in plan' },
  })
  .post('/:planId/categories', async ({ user, params, body }) => planController.createCategory(user, params, body as any), {
    detail: { summary: 'Create category' },
  })
  .patch('/:planId/categories/:categoryId', async ({ user, params, body }) => planController.updateCategory(user, params, body as any), {
    detail: { summary: 'Update category' },
  })
  .delete('/:planId/categories/:categoryId', async ({ user, params }) => planController.deleteCategory(user, params), {
    detail: { summary: 'Delete category' },
  })

  // Indicators (nested under category)
  .get('/:planId/categories/:categoryId/indicators', async ({ user, params }) => planController.getIndicators(user, params), {
    detail: { summary: 'List indicators in category' },
  })
  .get('/:planId/categories/:categoryId/indicators/:indicatorId', async ({ user, params }) => planController.getIndicatorById(user, params), {
    detail: { summary: 'Get indicator by ID' },
  })
  .post('/:planId/categories/:categoryId/indicators', async ({ user, params, body }) => planController.createIndicator(user, params, body as any), {
    detail: { summary: 'Create indicator' },
  })
  .patch('/:planId/categories/:categoryId/indicators/:indicatorId', async ({ user, params, body }) => planController.updateIndicator(user, params, body as any), {
    detail: { summary: 'Update indicator' },
  })
  .delete('/:planId/categories/:categoryId/indicators/:indicatorId', async ({ user, params }) => planController.deleteIndicator(user, params), {
    detail: { summary: 'Delete indicator' },
  })

  // Indicator Updates
  .get('/:planId/categories/:categoryId/indicators/:indicatorId/updates', async ({ user, params }) => planController.getUpdates(user, params), {
    detail: { summary: 'List updates for indicator' },
  })
  .post('/:planId/categories/:categoryId/indicators/:indicatorId/updates', async ({ user, params, body }) => planController.createUpdate(user, params, body as any), {
    detail: { summary: 'Create indicator update' },
  })
  .delete('/:planId/categories/:categoryId/indicators/:indicatorId/updates/:updateId', async ({ user, params }) => planController.deleteUpdate(user, params), {
    detail: { summary: 'Delete indicator update' },
  })

  // Plan progress
  .get('/:planId/progress', async ({ user, params }) => planController.getProgress(user, params), {
    detail: { summary: 'Calculate plan progress' },
  });
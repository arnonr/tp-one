import { Elysia } from 'elysia';
import { planController } from './plan.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const planPlugin = new Elysia({ prefix: '/api/plans' })
  .onBeforeHandle(authMiddleware())

  // ===== NEW: Plan → Strategy → Goal → Indicator (4-level hierarchy) =====

  // Strategies
  .get('/annual-plans/:planId/strategies', async ({ user, params }) => planController.listStrategies(user, params), {
    detail: { summary: 'List strategies for a plan' },
  })
  .post('/annual-plans/:planId/strategies', async ({ user, params, body }) => planController.createStrategy(user, params, body as any), {
    detail: { summary: 'Create strategy' },
  })
  .patch('/strategies/:id', async ({ user, params, body }) => planController.updateStrategy(user, params, body as any), {
    detail: { summary: 'Update strategy' },
  })
  .delete('/strategies/:id', async ({ user, params }) => planController.deleteStrategy(user, params), {
    detail: { summary: 'Delete strategy' },
  })

  // Goals
  .get('/strategies/:strategyId/goals', async ({ user, params }) => planController.listGoals(user, params), {
    detail: { summary: 'List goals for a strategy' },
  })
  .post('/strategies/:strategyId/goals', async ({ user, params, body }) => planController.createGoal(user, params, body as any), {
    detail: { summary: 'Create goal' },
  })
  .patch('/goals/:id', async ({ user, params, body }) => planController.updateGoal(user, params, body as any), {
    detail: { summary: 'Update goal' },
  })
  .delete('/goals/:id', async ({ user, params }) => planController.deleteGoal(user, params), {
    detail: { summary: 'Delete goal' },
  })

  // Indicators
  .get('/goals/:goalId/indicators', async ({ user, params }) => planController.listIndicators(user, params), {
    detail: { summary: 'List indicators for a goal' },
  })
  .post('/goals/:goalId/indicators', async ({ user, params, body }) => planController.createIndicator(user, params, body as any), {
    detail: { summary: 'Create indicator' },
  })
  .patch('/indicators/:id', async ({ user, params, body }) => planController.updateIndicator(user, params, body as any), {
    detail: { summary: 'Update indicator' },
  })
  .delete('/indicators/:id', async ({ user, params }) => planController.deleteIndicator(user, params), {
    detail: { summary: 'Delete indicator' },
  })

  // Indicator Assignees
  .get('/indicators/:id/assignees', async ({ user, params }) => planController.getIndicatorAssignees(user, params), {
    detail: { summary: 'List assignees for indicator' },
  })
  .post('/indicators/:id/assignees', async ({ user, params, body }) => planController.addIndicatorAssignee(user, params, body as any), {
    detail: { summary: 'Add assignee to indicator' },
  })
  .delete('/indicators/:id/assignees/:userId', async ({ user, params }) => planController.removeIndicatorAssignee(user, params), {
    detail: { summary: 'Remove assignee from indicator' },
  })

  // Indicator Updates
  .get('/indicators/:id/updates', async ({ user, params }) => planController.getIndicatorUpdates(user, params), {
    detail: { summary: 'List updates for indicator' },
  })
  .post('/indicators/:id/updates', async ({ user, params, body }) => planController.createIndicatorUpdate(user, params, body as any), {
    detail: { summary: 'Create indicator update' },
  })

  // Reports
  .get('/reports/plan-progress', async ({ user, query }) => planController.getPlanProgress(user, {}, query as any), {
    detail: { summary: 'Get plan progress aggregation' },
  });

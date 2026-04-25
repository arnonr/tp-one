import { Elysia } from 'elysia';
import { planController } from './plan.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const planPlugin = new Elysia({ prefix: '/api/plans' })
  .onBeforeHandle(authMiddleware())

  // ===== Annual Plans =====
  .get('/', async ({ user, query }) => planController.listPlans(user, {}, query as any), {
    detail: { summary: 'List annual plans' },
  })
  // NOTE: specific routes must come BEFORE /:planId to avoid being shadowed
  .get('/:planId/progress', async ({ user, params, query }) => planController.getPlanProgress(user, params, query as any), {
    detail: { summary: 'Get plan progress by plan ID' },
  })
  .get('/:planId', async ({ user, params }) => planController.getPlan(user, params), {
    detail: { summary: 'Get annual plan' },
  })
  .post('/', async ({ user, body }) => planController.createPlan(user, {}, body as any), {
    detail: { summary: 'Create annual plan' },
  })
  .patch('/:planId', async ({ user, params, body }) => planController.updatePlan(user, params, body as any), {
    detail: { summary: 'Update annual plan' },
  })
  .delete('/:planId', async ({ user, params }) => planController.deletePlan(user, params), {
    detail: { summary: 'Delete annual plan' },
  })

  // ===== Plan → Strategy → Goal → Indicator (4-level hierarchy) =====

  // Strategies
  .get('/annual-plans/:planId/strategies', async ({ user, params }) => planController.listStrategies(user, params), {
    detail: { summary: 'List strategies for a plan' },
  })
  .post('/annual-plans/:planId/strategies', async ({ user, params, body }) => planController.createStrategy(user, params, body as any), {
    detail: { summary: 'Create strategy' },
  })
  .patch('/strategies/:strategyId', async ({ user, params, body }) => planController.updateStrategy(user, params, body as any), {
    detail: { summary: 'Update strategy' },
  })
  .delete('/strategies/:strategyId', async ({ user, params }) => planController.deleteStrategy(user, params), {
    detail: { summary: 'Delete strategy' },
  })

  // Goals
  .get('/strategies/:strategyId/goals', async ({ user, params }) => planController.listGoals(user, params), {
    detail: { summary: 'List goals for a strategy' },
  })
  .post('/strategies/:strategyId/goals', async ({ user, params, body }) => planController.createGoal(user, params, body as any), {
    detail: { summary: 'Create goal' },
  })
  .patch('/goals/:goalId', async ({ user, params, body }) => planController.updateGoal(user, params, body as any), {
    detail: { summary: 'Update goal' },
  })
  .delete('/goals/:goalId', async ({ user, params }) => planController.deleteGoal(user, params), {
    detail: { summary: 'Delete goal' },
  })

  // Indicators
  .get('/goals/:goalId/indicators', async ({ user, params }) => planController.listIndicators(user, params), {
    detail: { summary: 'List indicators for a goal' },
  })
  .post('/goals/:goalId/indicators', async ({ user, params, body }) => planController.createIndicator(user, params, body as any), {
    detail: { summary: 'Create indicator' },
  })
  .patch('/indicators/:indicatorId', async ({ user, params, body }) => planController.updateIndicator(user, params, body as any), {
    detail: { summary: 'Update indicator' },
  })
  .delete('/indicators/:indicatorId', async ({ user, params }) => planController.deleteIndicator(user, params), {
    detail: { summary: 'Delete indicator' },
  })

  // Indicator Assignees
  .get('/indicators/:indicatorId/assignees', async ({ user, params }) => planController.getIndicatorAssignees(user, params), {
    detail: { summary: 'List assignees for indicator' },
  })
  .post('/indicators/:indicatorId/assignees', async ({ user, params, body }) => planController.addIndicatorAssignee(user, params, body as any), {
    detail: { summary: 'Add assignee to indicator' },
  })
  .delete('/indicators/:indicatorId/assignees/:userId', async ({ user, params }) => planController.removeIndicatorAssignee(user, params), {
    detail: { summary: 'Remove assignee from indicator' },
  })

  // Indicator Updates
  .get('/indicators/:indicatorId/updates', async ({ user, params }) => planController.getIndicatorUpdates(user, params), {
    detail: { summary: 'List updates for indicator' },
  })
  .post('/indicators/:indicatorId/updates', async ({ user, params, body }) => planController.createIndicatorUpdate(user, params, body as any), {
    detail: { summary: 'Create indicator update' },
  })

  // Indicator Audit Trail
  .get('/indicators/:indicatorId/audit-logs/export', async ({ user, params }) => planController.exportAuditLogs(user, params), {
    detail: { summary: 'Export indicator audit log to Excel' },
  })
  .get('/indicators/:indicatorId/audit-logs', async ({ user, params, query }) => planController.getIndicatorAuditLogs(user, params, query as any), {
    detail: { summary: 'Get indicator audit history' },
  })
  .post('/indicators/:indicatorId/revert', async ({ user, params, body }) => planController.revertIndicator(user, params, body as any), {
    detail: { summary: 'Revert indicator to previous state (admin)' },
  })

  // Reports
  .get('/reports/plan-progress', async ({ user, query }) => planController.getPlanProgress(user, {}, query as any), {
    detail: { summary: 'Get plan progress aggregation' },
  });

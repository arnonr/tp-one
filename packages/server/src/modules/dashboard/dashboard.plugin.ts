import Elysia from 'elysia';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const dashboardPlugin = new Elysia({ prefix: '/api/dashboard' })
  .onBeforeHandle(authMiddleware())

  .get('/stats', async ({ query }) => DashboardController.getStats(query), {
    detail: { summary: 'Get dashboard stats cards data' },
  })
  .get('/task-chart', async ({ query }) => DashboardController.getTaskChart(query), {
    detail: { summary: 'Get task status chart data' },
  })
  .get('/projects', async ({ query }) => DashboardController.getProjects(query), {
    detail: { summary: 'Get project progress data' },
  })
  .get('/workload', async ({ query }) => DashboardController.getWorkload(query), {
    detail: { summary: 'Get workload distribution data' },
  })
  .get('/kpi', async ({ query }) => DashboardController.getKpi(query), {
    detail: { summary: 'Get KPI achievement summary' },
  });
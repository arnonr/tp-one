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
  })
  .get('/overdue', async ({ query }) => DashboardController.getOverdue(query), {
    detail: { summary: 'Get overdue tasks' },
  })
  .get('/trend', async ({ query }) => DashboardController.getMonthlyTrend(query), {
    detail: { summary: 'Get monthly trend data' },
  })
  .get('/monthly-status-breakdown', async ({ query }) => DashboardController.getMonthlyStatusBreakdown(query), {
    detail: { summary: 'Get monthly status breakdown bar chart data' },
  })
  .get('/deadline-heatmap', async ({ query }) => DashboardController.getDeadlineHeatmap(query), {
    detail: { summary: 'Get deadline heatmap data' },
  });
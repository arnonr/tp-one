import { DashboardService } from './dashboard.service';
import { getCurrentFiscalYear } from '../../shared/thai.utils';

export const DashboardController = {
  async getStats(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const stats = await DashboardService.getStats(fiscalYear, workspaceId);
    return { success: true, data: stats };
  },

  async getTaskChart(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const chart = await DashboardService.getTaskStatusChart(fiscalYear, workspaceId);
    return { success: true, data: chart };
  },

  async getProjects(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const projects = await DashboardService.getProjectProgress(fiscalYear, workspaceId);
    return { success: true, data: projects };
  },

  async getWorkload(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const workload = await DashboardService.getWorkloadDistribution(fiscalYear, workspaceId);
    return { success: true, data: workload };
  },

  async getKpi(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const kpi = await DashboardService.getKpiSummary(fiscalYear, workspaceId);
    return { success: true, data: kpi };
  },

  async getOverdue(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const overdue = await DashboardService.getOverdueTasks(fiscalYear, workspaceId);
    return { success: true, data: { overdue } };
  },

  async getMonthlyTrend(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const monthlyTrend = await DashboardService.getMonthlyTrend(fiscalYear, workspaceId);
    return { success: true, data: { monthlyTrend } };
  },

  async getMonthlyStatusBreakdown(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const breakdown = await DashboardService.getMonthlyStatusBreakdown(fiscalYear, workspaceId);
    return { success: true, data: { monthlyStatusBreakdown: breakdown } };
  },

  async getDeadlineHeatmap(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workspaceId = query.workspaceId || null;
    const deadlineHeatmap = await DashboardService.getDeadlineHeatmap(fiscalYear, workspaceId);
    return { success: true, data: { deadlineHeatmap } };
  },
};
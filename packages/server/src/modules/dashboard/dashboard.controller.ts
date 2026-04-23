import { DashboardService } from './dashboard.service';
import { getCurrentFiscalYear } from '../../shared/thai.utils';

export const DashboardController = {
  async getStats(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const stats = await DashboardService.getStats(fiscalYear);
    return { success: true, data: stats };
  },

  async getTaskChart(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const chart = await DashboardService.getTaskStatusChart(fiscalYear);
    return { success: true, data: chart };
  },

  async getProjects(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const projects = await DashboardService.getProjectProgress(fiscalYear);
    return { success: true, data: projects };
  },

  async getWorkload(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const workload = await DashboardService.getWorkloadDistribution(fiscalYear);
    return { success: true, data: workload };
  },

  async getKpi(query: any) {
    const fiscalYear = query.fiscalYear ? Number(query.fiscalYear) : getCurrentFiscalYear();
    const kpi = await DashboardService.getKpiSummary(fiscalYear);
    return { success: true, data: kpi };
  },
};
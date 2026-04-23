import { ReportService } from './report.service';
import { generateSummaryPDF, generateMonthlyPDF } from './pdf.service';
import { generateSummaryExcel, generateMonthlyExcel } from './excel.service';
import { THAI_MONTHS_SHORT } from '../../shared/thai.utils';

export const ReportController = {
  async getSummary(user: any, query: { fiscalYear?: number; workspaceId?: string }) {
    const fy = query.fiscalYear || new Date().getFullYear() + 543;
    const data = await ReportService.getSummary(fy, query.workspaceId || null);
    return { success: true, data };
  },

  async getMonthly(user: any, query: { fiscalYear: number; month: number; workspaceId?: string }) {
    const tasks = await ReportService.getMonthlyDetail(
      query.fiscalYear,
      query.month,
      query.workspaceId || null
    );
    const summary = await ReportService.getSummary(query.fiscalYear, query.workspaceId || null);
    const monthName = THAI_MONTHS_SHORT[query.month - 1] || '';
    return {
      success: true,
      data: { tasks, monthName, fiscalYear: query.fiscalYear },
    };
  },

  async exportPDF(user: any, query: { fiscalYear: number; type: string; workspaceId?: string; month?: number }) {
    const fy = query.fiscalYear || new Date().getFullYear() + 543;

    if (query.type === 'monthly' && query.month) {
      const tasks = await ReportService.getMonthlyDetail(fy, query.month, query.workspaceId || null);
      const summary = await ReportService.getSummary(fy, query.workspaceId || null);
      const monthName = THAI_MONTHS_SHORT[query.month - 1] + ` ${fy}`;
      const pdf = await generateMonthlyPDF({ month: query.month, year: fy, tasks, summary }, monthName);
      return pdf;
    }

    // Default: summary PDF
    const data = await ReportService.getSummary(fy, query.workspaceId || null);
    return generateSummaryPDF(data);
  },

  async exportExcel(user: any, query: { fiscalYear: number; type: string; workspaceId?: string; month?: number }) {
    const fy = query.fiscalYear || new Date().getFullYear() + 543;

    if (query.type === 'monthly' && query.month) {
      const tasks = await ReportService.getMonthlyDetail(fy, query.month, query.workspaceId || null);
      const monthName = `${THAI_MONTHS_SHORT[query.month - 1]} ${fy}`;
      const excel = await generateMonthlyExcel({ monthName, fiscalYear: fy, tasks });
      return excel;
    }

    const data = await ReportService.getSummary(fy, query.workspaceId || null);
    return generateSummaryExcel(data);
  },
};
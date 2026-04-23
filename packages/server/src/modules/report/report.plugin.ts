import Elysia from 'elysia';
import { t } from 'elysia';
import { ReportController } from './report.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const reportPlugin = new Elysia({ prefix: '/api/reports' })
  .onBeforeHandle(authMiddleware())

  // GET /api/reports/summary?fiscalYear=2569&workspaceId=xxx
  .get('/summary', async ({ user, query }) => ReportController.getSummary(user!, query), {
    query: t.Object({
      fiscalYear: t.Optional(t.Number()),
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'รายงานสรุปภาพรวม' },
  })

  // GET /api/reports/monthly?fiscalYear=2569&month=4&workspaceId=xxx
  .get('/monthly', async ({ user, query }) => ReportController.getMonthly(user!, query), {
    query: t.Object({
      fiscalYear: t.Number(),
      month: t.Number({ minimum: 1, maximum: 12 }),
      workspaceId: t.Optional(t.String()),
    }),
    detail: { summary: 'รายละเอียดรายเดือน' },
  })

  // GET /api/reports/export/pdf?fiscalYear=2569&type=summary&workspaceId=xxx
  .get('/export/pdf', async ({ user, query }) => {
    const pdf = await ReportController.exportPDF(user!, query) as Buffer;
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${query.fiscalYear}-${query.type || 'summary'}.pdf"`,
      },
    });
  }, {
    query: t.Object({
      fiscalYear: t.Optional(t.Number()),
      type: t.Optional(t.String()),
      workspaceId: t.Optional(t.String()),
      month: t.Optional(t.Number()),
    }),
    detail: { summary: 'ส่งออก PDF' },
  })

  // GET /api/reports/export/excel?fiscalYear=2569&type=summary&workspaceId=xxx
  .get('/export/excel', async ({ user, query }) => {
    const excel = await ReportController.exportExcel(user!, query) as Buffer;
    return new Response(excel, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report-${query.fiscalYear}-${query.type || 'summary'}.xlsx"`,
      },
    });
  }, {
    query: t.Object({
      fiscalYear: t.Optional(t.Number()),
      type: t.Optional(t.String()),
      workspaceId: t.Optional(t.String()),
      month: t.Optional(t.Number()),
    }),
    detail: { summary: 'ส่งออก Excel' },
  });
import Elysia from 'elysia';
import { t } from 'elysia';
import { ProjectController } from './project.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const projectPlugin = new Elysia({ prefix: '/api/projects' })
  .onBeforeHandle(authMiddleware())

  // Project CRUD
  .get('/', async ({ query, user }) => ProjectController.list(query), {
    detail: { summary: 'List projects with optional filters' },
  })
  .get('/:id', async ({ params }) => ProjectController.getById(params), {
    detail: { summary: 'Get project by ID' },
  })
  .post('/', async ({ user, body }) => ProjectController.create(user, body), {
    body: t.Object({
      workspaceId: t.String(),
      name: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String({ maxLength: 2000 })),
      status: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
      ownerId: t.Optional(t.String()),
    }),
    detail: { summary: 'Create new project' },
  })
  .patch('/:id', async ({ user, params, body }) => ProjectController.update(user, params, body), {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      description: t.Optional(t.String({ maxLength: 2000 })),
      status: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
    }),
    detail: { summary: 'Update project' },
  })
  .delete('/:id', async ({ user, params }) => ProjectController.remove(user, params), {
    detail: { summary: 'Delete project' },
  })

  // Members
  .get('/:id/members', async ({ params }) => ProjectController.getMembers(params), {
    detail: { summary: 'Get project members' },
  })
  .post('/:id/members', async ({ user, params, body }) => ProjectController.addMember(user, params, body), {
    body: t.Object({
      userId: t.String(),
      role: t.Optional(t.Union([t.Literal('member'), t.Literal('viewer')])),
    }),
    detail: { summary: 'Add project member' },
  })
  .delete('/:id/members/:userId', async ({ user, params }) => ProjectController.removeMember(user, params), {
    detail: { summary: 'Remove project member' },
  })
  .patch('/:id/members/:userId', async ({ user, params, body }) => ProjectController.updateMemberRole(user, params, body), {
    body: t.Object({
      role: t.Union([t.Literal('member'), t.Literal('viewer')]),
    }),
    detail: { summary: 'Update member role' },
  })

  // Progress
  .post('/:id/recalculate-progress', async ({ params }) => ProjectController.recalculateProgress(params), {
    detail: { summary: 'Recalculate project progress from tasks' },
  })

  // KPIs
  .get('/:id/kpis', async ({ params }) => ProjectController.getKpis(params), {
    detail: { summary: 'Get project KPIs' },
  })
  .post('/:id/kpis', async ({ user, params, body }) => ProjectController.createKpi(user, params, body), {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      targetValue: t.String(),
      unit: t.Optional(t.String({ maxLength: 50 })),
      period: t.Optional(t.Union([t.Literal('monthly'), t.Literal('quarterly'), t.Literal('yearly')])),
    }),
    detail: { summary: 'Create KPI' },
  })
  .patch('/:id/kpis/:kpiId', async ({ user, params, body }) => ProjectController.updateKpi(user, params, body), {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      targetValue: t.Optional(t.String()),
      currentValue: t.Optional(t.String()),
      unit: t.Optional(t.String({ maxLength: 50 })),
      period: t.Optional(t.Union([t.Literal('monthly'), t.Literal('quarterly'), t.Literal('yearly')])),
    }),
    detail: { summary: 'Update KPI' },
  })
  .delete('/:id/kpis/:kpiId', async ({ user, params }) => ProjectController.deleteKpi(user, params), {
    detail: { summary: 'Delete KPI' },
  })

  // KPI Audit Logs
  .get('/:id/kpis/:kpiId/audit-logs', async ({ params }) => ProjectController.getKpiAuditLogs(params), {
    detail: { summary: 'Get KPI audit history' },
  })
  .post('/:id/kpis/:kpiId/revert', async ({ user, params, body }) => ProjectController.revertKpi(user, params, body), {
    body: t.Object({
      auditLogId: t.String(),
      reason: t.Optional(t.String()),
    }),
    detail: { summary: 'Revert KPI to previous state from audit log' },
  });
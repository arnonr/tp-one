import type { GlobalRole } from '../../shared/constants';
import type {
  CreateStrategyInput,
  UpdateStrategyInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  CreateIndicatorUpdateInput,
  ProgressPeriod,
} from './types';

function parseParams(params: Record<string, string | undefined>) {
  return {
    planId: params.planId,
    strategyId: params.strategyId,
    goalId: params.goalId,
    indicatorId: params.indicatorId,
    userId: params.userId,
  };
}

export const planController = {
  // Annual Plans

  async listPlans(
    _user: { id: string; role: GlobalRole },
    _params: Record<string, string>,
    query: { fiscalYear?: string; status?: string },
  ) {
    const { planService } = await import('./plan.service');
    return planService.listPlans(query.fiscalYear ? parseInt(query.fiscalYear) : undefined, query.status);
  },

  async getPlan(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getPlan(planId!);
  },

  async createPlan(
    user: { id: string; role: GlobalRole },
    _params: Record<string, string>,
    body: { year: number; name: string; description?: string },
  ) {
    const { planService } = await import('./plan.service');
    return planService.createPlan(body, user.userId);
  },

  async updatePlan(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: { name?: string; description?: string; status?: string },
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updatePlan(planId!, body);
  },

  async deletePlan(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deletePlan(planId!);
  },

  // Strategy CRUD

  async listStrategies(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.listStrategies(planId!);
  },

  async createStrategy(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: CreateStrategyInput,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createStrategy(planId!, body, _user.userId);
  },

  async updateStrategy(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: UpdateStrategyInput,
  ) {
    const { strategyId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateStrategy(strategyId!, body);
  },

  async deleteStrategy(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { strategyId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteStrategy(strategyId!);
  },

  // Goal CRUD

  async listGoals(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { strategyId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.listGoals(strategyId!);
  },

  async createGoal(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: CreateGoalInput,
  ) {
    const { strategyId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createGoal(strategyId!, body);
  },

  async updateGoal(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: UpdateGoalInput,
  ) {
    const { goalId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateGoal(goalId!, body);
  },

  async deleteGoal(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { goalId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteGoal(goalId!);
  },

  // Indicator CRUD

  async listIndicators(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { goalId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.listIndicators(goalId!);
  },

  async createIndicator(
    user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: CreateIndicatorInput,
  ) {
    const { goalId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createIndicator(goalId!, body, (user as any).userId ?? user.id);
  },

  async updateIndicator(
    user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: UpdateIndicatorInput,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateIndicator(indicatorId!, body, (user as any).userId ?? user.id);
  },

  async deleteIndicator(
    user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteIndicator(indicatorId!, (user as any).userId ?? user.id);
  },

  // Assignee management

  async getIndicatorAssignees(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getIndicatorAssignees(indicatorId!);
  },

  async addIndicatorAssignee(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: { userId: string },
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.addIndicatorAssignee(indicatorId!, body.userId);
  },

  async removeIndicatorAssignee(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId, userId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.removeIndicatorAssignee(indicatorId!, userId!);
  },

  // Indicator Updates

  async getIndicatorUpdates(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getIndicatorUpdates(indicatorId!);
  },

  async createIndicatorUpdate(
    user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: CreateIndicatorUpdateInput,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createIndicatorUpdate(indicatorId!, user.userId, body);
  },

  // Indicator Audit Trail

  async getIndicatorAuditLogs(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    query: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getIndicatorAuditLogs(
      indicatorId!,
      query.page ? parseInt(query.page) : 1,
      query.pageSize ? parseInt(query.pageSize) : 20,
    );
  },

  async revertIndicator(
    user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: { auditLogId: string; reason: string },
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.revertIndicator(indicatorId!, (user as any).userId ?? user.id, body.auditLogId, body.reason);
  },

  async exportAuditLogs(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    const buffer = await planService.exportAuditLogs(indicatorId!);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=indicator-audit-log.xlsx',
      },
    });
  },

  // Progress

  async getPlanProgress(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    query: { planId?: string; period?: ProgressPeriod },
  ) {
    const planId = query.planId ?? params.planId;
    const { planService } = await import('./plan.service');
    return planService.getPlanProgress(planId!, query.period ?? 'monthly');
  },

  // Plan Report Export

  async exportPlanPDF(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    query: Record<string, string>,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    const buffer = await planService.exportPlanPDF(planId!, query.period as ProgressPeriod);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=plan-report-${planId}.pdf`,
      },
    });
  },

  async exportPlanExcel(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    query: Record<string, string>,
  ) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    const buffer = await planService.exportPlanExcel(planId!, query.period as ProgressPeriod);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=plan-report-${planId}.xlsx`,
      },
    });
  },
};

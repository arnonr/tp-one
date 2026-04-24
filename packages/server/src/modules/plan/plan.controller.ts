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
    return planService.createStrategy(planId!, body, _user.id);
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
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: CreateIndicatorInput,
  ) {
    const { goalId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createIndicator(goalId!, body);
  },

  async updateIndicator(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
    body: UpdateIndicatorInput,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateIndicator(indicatorId!, body);
  },

  async deleteIndicator(
    _user: { id: string; role: GlobalRole },
    params: Record<string, string>,
  ) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteIndicator(indicatorId!);
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
    return planService.createIndicatorUpdate(indicatorId!, user.id, body);
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
};

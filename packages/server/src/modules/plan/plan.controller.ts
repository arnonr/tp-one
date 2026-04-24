import type { GlobalRole } from '../../shared/constants';

function parseParams(params: Record<string, string | undefined>) {
  return {
    planId: params.planId,
    categoryId: params.categoryId,
    indicatorId: params.indicatorId,
    updateId: params.updateId,
  };
}

export const planController = {
  // Plan
  async list(_user: { id: string; role: GlobalRole }, query: { fiscalYear?: number; status?: string }) {
    const { planService } = await import('./plan.service');
    return planService.list(query.fiscalYear, query.status);
  },

  async getById(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getById(planId!);
  },

  async create(user: { id: string; role: GlobalRole }, body: { year: number; name: string; description?: string; status?: string }) {
    const { planService } = await import('./plan.service');
    return planService.create({ ...body, createdById: user.id });
  },

  async update(_user: { id: string; role: GlobalRole }, params: Record<string, string>, body: { name?: string; description?: string; status?: string }) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.update(planId!, body);
  },

  async delete(user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.delete(planId!, user.role);
  },

  // Category
  async getCategories(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getCategories(planId!);
  },

  async createCategory(_user: { id: string; role: GlobalRole }, params: Record<string, string>, body: { code: string; name: string; sortOrder?: number }) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createCategory(planId!, body);
  },

  async updateCategory(_user: { id: string; role: GlobalRole }, params: Record<string, string>, body: { code?: string; name?: string; sortOrder?: number }) {
    const { categoryId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateCategory(categoryId!, body);
  },

  async deleteCategory(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { categoryId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteCategory(categoryId!);
  },

  // Indicator
  async getIndicators(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { categoryId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getIndicators(categoryId!);
  },

  async getIndicatorById(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getIndicatorById(indicatorId!);
  },

  async createIndicator(_user: { id: string; role: GlobalRole }, params: Record<string, string>, body: {
    code: string; name: string; description?: string; targetValue: string; unit?: string; indicatorType?: string; assigneeId?: string; sortOrder?: number;
  }) {
    const { categoryId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createIndicator(categoryId!, body);
  },

  async updateIndicator(_user: { id: string; role: GlobalRole }, params: Record<string, string>, body: {
    code?: string; name?: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; assigneeId?: string; sortOrder?: number;
  }) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.updateIndicator(indicatorId!, body);
  },

  async deleteIndicator(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteIndicator(indicatorId!);
  },

  // Indicator Update
  async getUpdates(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.getUpdates(indicatorId!);
  },

  async createUpdate(user: { id: string; role: GlobalRole }, params: Record<string, string>, body: {
    reportedValue: string; reportedMonth: number; reportedYear: number; progressPct?: string; note?: string; evidenceUrl?: string;
  }) {
    const { indicatorId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.createUpdate(indicatorId!, user.id, body);
  },

  async deleteUpdate(user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { updateId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.deleteUpdate(updateId!, user.id, user.role);
  },

  // Progress
  async getProgress(_user: { id: string; role: GlobalRole }, params: Record<string, string>) {
    const { planId } = parseParams(params);
    const { planService } = await import('./plan.service');
    return planService.calculatePlanProgress(planId!);
  },
};
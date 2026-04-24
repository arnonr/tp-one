import api from "./api";

export interface PlanCategory {
  id: string;
  planId: string;
  code: string;
  name: string;
  sortOrder: number;
  indicators: PlanIndicator[];
}

export interface PlanIndicator {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  targetValue: string;
  unit: string | null;
  indicatorType: string;
  assigneeId: string | null;
  assigneeName: string | null;
  sortOrder: number;
}

export interface IndicatorUpdate {
  id: string;
  indicatorId: string;
  reportedValue: string;
  reportedMonth: number;
  reportedYear: number;
  progressPct: string | null;
  note: string | null;
  evidenceUrl: string | null;
  reportedBy: string;
  reporterName: string | null;
  createdAt: string;
}

export interface AnnualPlan {
  id: string;
  year: number;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed";
  createdById: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string | null;
  categoryCount: number;
  indicatorCount: number;
  categories?: PlanCategory[];
}

export interface PlanListItem {
  id: string;
  year: number;
  name: string;
  description: string | null;
  status: "draft" | "active" | "completed";
  createdById: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string | null;
  categoryCount: number;
  indicatorCount: number;
}

// Plans
export async function listPlans(fiscalYear?: number, status?: string) {
  const params: Record<string, string> = {};
  if (fiscalYear) params.fiscalYear = String(fiscalYear);
  if (status) params.status = status;
  const { data } = await api.get("/plans", { params });
  return data as PlanListItem[];
}

export async function getPlan(id: string) {
  const { data } = await api.get(`/plans/${id}`);
  return data as AnnualPlan;
}

export async function createPlan(payload: { year: number; name: string; description?: string; status?: string }) {
  const { data } = await api.post("/plans", payload);
  return data as AnnualPlan;
}

export async function updatePlan(id: string, payload: { name?: string; description?: string; status?: string }) {
  const { data } = await api.patch(`/plans/${id}`, payload);
  return data as AnnualPlan;
}

export async function deletePlan(id: string) {
  const { data } = await api.delete(`/plans/${id}`);
  return data;
}

// Categories
export async function listCategories(planId: string) {
  const { data } = await api.get(`/plans/${planId}/categories`);
  return data as PlanCategory[];
}

export async function createCategory(planId: string, payload: { code: string; name: string; sortOrder?: number }) {
  const { data } = await api.post(`/plans/${planId}/categories`, payload);
  return data as PlanCategory;
}

export async function updateCategory(categoryId: string, payload: { code?: string; name?: string; sortOrder?: number }, planId: string) {
  const { data } = await api.patch(`/plans/${planId}/categories/${categoryId}`, payload);
  return data as PlanCategory;
}

export async function deleteCategory(categoryId: string, planId: string) {
  const { data } = await api.delete(`/plans/${planId}/categories/${categoryId}`);
  return data;
}

// Indicators
export async function listIndicators(planId: string, categoryId: string) {
  const { data } = await api.get(`/plans/${planId}/categories/${categoryId}/indicators`);
  return data as PlanIndicator[];
}

export async function getIndicator(planId: string, categoryId: string, indicatorId: string) {
  const { data } = await api.get(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}`);
  return data as PlanIndicator;
}

export async function createIndicator(categoryId: string, planId: string, payload: {
  code: string; name: string; description?: string; targetValue: string; unit?: string; indicatorType?: string; assigneeId?: string; sortOrder?: number;
}) {
  const { data } = await api.post(`/plans/${planId}/categories/${categoryId}/indicators`, payload);
  return data as PlanIndicator;
}

export async function updateIndicator(planId: string, categoryId: string, indicatorId: string, payload: {
  code?: string; name?: string; description?: string; targetValue?: string; unit?: string; indicatorType?: string; assigneeId?: string; sortOrder?: number;
}) {
  const { data } = await api.patch(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}`, payload);
  return data as PlanIndicator;
}

export async function deleteIndicator(planId: string, categoryId: string, indicatorId: string) {
  const { data } = await api.delete(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}`);
  return data;
}

// Indicator Updates
export async function listUpdates(planId: string, categoryId: string, indicatorId: string) {
  const { data } = await api.get(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}/updates`);
  return data as IndicatorUpdate[];
}

export async function createUpdate(planId: string, categoryId: string, indicatorId: string, payload: {
  reportedValue: string; reportedMonth: number; reportedYear: number; progressPct?: string; note?: string; evidenceUrl?: string;
}) {
  const { data } = await api.post(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}/updates`, payload);
  return data as IndicatorUpdate;
}

export async function deleteUpdate(planId: string, categoryId: string, indicatorId: string, updateId: string) {
  const { data } = await api.delete(`/plans/${planId}/categories/${categoryId}/indicators/${indicatorId}/updates/${updateId}`);
  return data;
}

// Progress
export async function getPlanProgress(planId: string) {
  const { data } = await api.get(`/plans/${planId}/progress`);
  return data as { progress: number; byCategory: Record<string, number> };
}
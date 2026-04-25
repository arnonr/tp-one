// 4-level Annual Plan hierarchy types

export interface AnnualPlan {
  id: string;
  year: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
}

export interface Strategy {
  id: string;
  planId: string;
  code: string; // S1, S2, ...
  name: string;
  description?: string;
  sortOrder: number;
  goals?: Goal[];
}

export interface Goal {
  id: string;
  strategyId: string;
  code: string; // S1-G1, S1-G2, ...
  name: string;
  description?: string;
  sortOrder: number;
  indicators?: Indicator[];
}

export interface Indicator {
  id: string;
  goalId: string;
  code: string; // S1-G1-K01, ...
  name: string;
  description?: string;
  targetValue: string;
  unit?: string;
  indicatorType: 'amount' | 'count' | 'percentage';
  weight: number;
  sortOrder: number;
  assignees?: UserMini[];
}

export interface IndicatorUpdate {
  id: string;
  indicatorId: string;
  reportedValue: string;
  reportedDate: string;
  progressPct?: string;
  note?: string;
  evidenceUrl?: string;
  reportedBy: string;
  reporterName?: string;
  createdAt: string;
}

export interface UserMini {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface IndicatorProgress {
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  targetValue: string;
  unit?: string;
  weight: string;
  latestValue?: string;
  latestProgressPct?: number;
  periodLabel: string;
}

export interface GoalProgress {
  goalId: string;
  goalCode: string;
  goalName: string;
  indicators: IndicatorProgress[];
  weightedProgress: number;
  totalWeight: number;
}

export interface StrategyProgress {
  strategyId: string;
  strategyCode: string;
  strategyName: string;
  goals: GoalProgress[];
  weightedProgress: number;
  totalWeight: number;
}

export interface PlanProgress {
  planId: string;
  planYear: number;
  period: string;
  strategies: StrategyProgress[];
  overallProgress: number;
  totalWeight: number;
}

export interface PlanListItem {
  id: string;
  year: number;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
}

// ===== Audit Trail =====

export interface IndicatorAuditLogEntry {
  id: string;
  indicatorId: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  action: 'created' | 'updated' | 'deleted' | 'reverted';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface IndicatorAuditLogResponse {
  data: IndicatorAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
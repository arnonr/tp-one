import type { GlobalRole } from '../../shared/constants';

// ===== Strategy =====

export interface CreateStrategyInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  sortOrder?: number;
}

// ===== Goal =====

export interface CreateGoalInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  sortOrder?: number;
}

// ===== Indicator =====

export interface CreateIndicatorInput {
  name: string;
  description?: string;
  targetValue: string;
  unit?: string;
  indicatorType?: string;
  weight?: string;
  sortOrder?: number;
}

export interface UpdateIndicatorInput {
  name?: string;
  description?: string;
  targetValue?: string;
  unit?: string;
  indicatorType?: string;
  weight?: string;
  sortOrder?: number;
}

// ===== Indicator Update =====

export interface CreateIndicatorUpdateInput {
  reportedDate: string;
  reportedValue: string;
  progressPct?: string;
  note?: string;
  evidenceUrl?: string;
}

// ===== Progress =====

export type ProgressPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

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
  periodStart: Date;
  periodEnd: Date;
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
  period: ProgressPeriod;
  strategies: StrategyProgress[];
  overallProgress: number;
  totalWeight: number;
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

export interface RevertInput {
  auditLogId: string;
  reason: string;
}

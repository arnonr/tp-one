import { db } from '../../config/database';
import {
  strategies,
} from '../../db/schema/strategies';
import {
  goals,
} from '../../db/schema/goals';
import {
  indicators,
  indicatorAssignees,
} from '../../db/schema/indicators';
import {
  indicatorUpdates,
} from '../../db/schema/indicator-updates';
import { annualPlans } from '../../db/schema/annual-plans';
import { users } from '../../db/schema/users';
import { eq, and, desc, asc, count, inArray, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../../shared/errors';
import {
  getFiscalYear,
  getFiscalQuarter,
  THAI_MONTHS_SHORT,
} from '../../shared/thai.utils';
import type {
  CreateStrategyInput,
  UpdateStrategyInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  CreateIndicatorUpdateInput,
  ProgressPeriod,
  PlanProgress,
  StrategyProgress,
  GoalProgress,
  IndicatorProgress,
} from './types';

// ===== helpers =====

async function resolvePlan(planId: string) {
  const [p] = await db.select().from(annualPlans).where(eq(annualPlans.id, planId)).limit(1);
  if (!p) throw new NotFoundError('Plan', planId);
  return p;
}

async function resolveStrategy(strategyId: string) {
  const [s] = await db.select().from(strategies).where(eq(strategies.id, strategyId)).limit(1);
  if (!s) throw new NotFoundError('Strategy', strategyId);
  return s;
}

async function resolveGoal(goalId: string) {
  const [g] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!g) throw new NotFoundError('Goal', goalId);
  return g;
}

async function resolveIndicator(indicatorId: string) {
  const [i] = await db.select().from(indicators).where(eq(indicators.id, indicatorId)).limit(1);
  if (!i) throw new NotFoundError('Indicator', indicatorId);
  return i;
}

// ===== auto-code generators =====

async function generateStrategyCode(planId: string): Promise<string> {
  const result = await db
    .select({ cnt: count() })
    .from(strategies)
    .where(eq(strategies.planId, planId));
  const cnt = result[0]?.cnt ?? 0;
  return `S${Number(cnt) + 1}`;
}

async function generateGoalCode(strategyId: string): Promise<string> {
  const [strategy] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, strategyId))
    .limit(1);
  if (!strategy) throw new NotFoundError('Strategy', strategyId);

  const result = await db
    .select({ cnt: count() })
    .from(goals)
    .where(eq(goals.strategyId, strategyId));
  const cnt = result[0]?.cnt ?? 0;
  return `${strategy.code}-G${Number(cnt) + 1}`;
}

async function generateIndicatorCode(goalId: string): Promise<string> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw new NotFoundError('Goal', goalId);

  const [strategy] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, goal.strategyId))
    .limit(1);
  if (!strategy) throw new NotFoundError('Strategy', goal.strategyId);

  const result = await db
    .select({ cnt: count() })
    .from(indicators)
    .where(eq(indicators.goalId, goalId));
  const cnt = result[0]?.cnt ?? 0;
  return `${strategy.code}-${goal.code}-K${String(Number(cnt) + 1).padStart(2, '0')}`;
}

// ===== Strategy =====

export const planService = {
  // Strategy CRUD

  async listStrategies(planId: string) {
    await resolvePlan(planId);
    return db
      .select({
        id: strategies.id,
        planId: strategies.planId,
        code: strategies.code,
        name: strategies.name,
        description: strategies.description,
        sortOrder: strategies.sortOrder,
        createdAt: strategies.createdAt,
        updatedAt: strategies.updatedAt,
      })
      .from(strategies)
      .where(eq(strategies.planId, planId))
      .orderBy(asc(strategies.sortOrder), asc(strategies.createdAt));
  },

  async createStrategy(planId: string, data: CreateStrategyInput, createdById: string) {
    await resolvePlan(planId);
    if (!data.name?.trim()) throw new ValidationError('name is required');

    const code = await generateStrategyCode(planId);
    const [strategy] = await db
      .insert(strategies)
      .values({
        planId,
        code,
        name: data.name.trim(),
        description: data.description?.trim(),
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return strategy;
  },

  async updateStrategy(strategyId: string, data: UpdateStrategyInput) {
    await resolveStrategy(strategyId);
    const [updated] = await db
      .update(strategies)
      .set({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(strategies.id, strategyId))
      .returning();
    return updated;
  },

  async deleteStrategy(strategyId: string) {
    const strategy = await resolveStrategy(strategyId);

    // cascade delete: goals -> indicators -> updates -> assignees -> goals
    const goalRows = await db
      .select({ id: goals.id })
      .from(goals)
      .where(eq(goals.strategyId, strategyId));
    const goalIds = goalRows.map(g => g.id);

    if (goalIds.length > 0) {
      // get all indicators under these goals
      const indRows = await db
        .select({ id: indicators.id })
        .from(indicators)
        .where(inArray(indicators.goalId, goalIds));
      const indIds = indRows.map(i => i.id);

      if (indIds.length > 0) {
        // delete updates first
        await db.delete(indicatorUpdates).where(inArray(indicatorUpdates.indicatorId, indIds));
        // delete assignees
        await db.delete(indicatorAssignees).where(inArray(indicatorAssignees.indicatorId, indIds));
        // delete indicators
        await db.delete(indicators).where(inArray(indicators.goalId, goalIds));
      }
      // delete goals
      await db.delete(goals).where(inArray(goals.strategyId, strategyId));
    }

    await db.delete(strategies).where(eq(strategies.id, strategyId));
    return { success: true };
  },

  // Goal CRUD

  async listGoals(strategyId: string) {
    await resolveStrategy(strategyId);
    return db
      .select({
        id: goals.id,
        strategyId: goals.strategyId,
        code: goals.code,
        name: goals.name,
        description: goals.description,
        sortOrder: goals.sortOrder,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
      })
      .from(goals)
      .where(eq(goals.strategyId, strategyId))
      .orderBy(asc(goals.sortOrder), asc(goals.createdAt));
  },

  async createGoal(strategyId: string, data: CreateGoalInput) {
    await resolveStrategy(strategyId);
    if (!data.name?.trim()) throw new ValidationError('name is required');

    const code = await generateGoalCode(strategyId);
    const [goal] = await db
      .insert(goals)
      .values({
        strategyId,
        code,
        name: data.name.trim(),
        description: data.description?.trim(),
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return goal;
  },

  async updateGoal(goalId: string, data: UpdateGoalInput) {
    await resolveGoal(goalId);
    const [updated] = await db
      .update(goals)
      .set({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(goals.id, goalId))
      .returning();
    return updated;
  },

  async deleteGoal(goalId: string) {
    const goal = await resolveGoal(goalId);

    // cascade delete: indicators -> updates -> assignees -> goal
    const indRows = await db
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.goalId, goalId));
    const indIds = indRows.map(i => i.id);

    if (indIds.length > 0) {
      await db.delete(indicatorUpdates).where(inArray(indicatorUpdates.indicatorId, indIds));
      await db.delete(indicatorAssignees).where(inArray(indicatorAssignees.indicatorId, indIds));
      await db.delete(indicators).where(inArray(indicators.goalId, goalId));
    }

    await db.delete(goals).where(eq(goals.id, goalId));
    return { success: true };
  },

  // Indicator CRUD

  async listIndicators(goalId: string) {
    await resolveGoal(goalId);
    return db
      .select({
        id: indicators.id,
        goalId: indicators.goalId,
        code: indicators.code,
        name: indicators.name,
        description: indicators.description,
        targetValue: indicators.targetValue,
        unit: indicators.unit,
        indicatorType: indicators.indicatorType,
        weight: indicators.weight,
        sortOrder: indicators.sortOrder,
        createdAt: indicators.createdAt,
        updatedAt: indicators.updatedAt,
      })
      .from(indicators)
      .where(eq(indicators.goalId, goalId))
      .orderBy(asc(indicators.sortOrder), asc(indicators.createdAt));
  },

  async createIndicator(goalId: string, data: CreateIndicatorInput) {
    await resolveGoal(goalId);
    if (!data.name?.trim()) throw new ValidationError('name is required');
    if (!data.targetValue?.trim()) throw new ValidationError('targetValue is required');

    const code = await generateIndicatorCode(goalId);
    const [indicator] = await db
      .insert(indicators)
      .values({
        goalId,
        code,
        name: data.name.trim(),
        description: data.description?.trim(),
        targetValue: data.targetValue,
        unit: data.unit,
        indicatorType: (data.indicatorType as any) ?? 'amount',
        weight: data.weight ?? '1',
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return indicator;
  },

  async updateIndicator(indicatorId: string, data: UpdateIndicatorInput) {
    await resolveIndicator(indicatorId);
    const [updated] = await db
      .update(indicators)
      .set({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.indicatorType !== undefined && { indicatorType: data.indicatorType as any }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(indicators.id, indicatorId))
      .returning();
    return updated;
  },

  async deleteIndicator(indicatorId: string) {
    const indicator = await resolveIndicator(indicatorId);

    // delete updates first, then assignees, then indicator
    await db.delete(indicatorUpdates).where(eq(indicatorUpdates.indicatorId, indicatorId));
    await db.delete(indicatorAssignees).where(eq(indicatorAssignees.indicatorId, indicatorId));
    await db.delete(indicators).where(eq(indicators.id, indicatorId));
    return { success: true };
  },

  // Assignee management

  async getIndicatorAssignees(indicatorId: string) {
    await resolveIndicator(indicatorId);
    return db
      .select({
        id: indicatorAssignees.id,
        indicatorId: indicatorAssignees.indicatorId,
        userId: indicatorAssignees.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(indicatorAssignees)
      .leftJoin(users, eq(indicatorAssignees.userId, users.id))
      .where(eq(indicatorAssignees.indicatorId, indicatorId));
  },

  async addIndicatorAssignee(indicatorId: string, userId: string) {
    await resolveIndicator(indicatorId);

    // check for duplicate
    const [existing] = await db
      .select()
      .from(indicatorAssignees)
      .where(and(eq(indicatorAssignees.indicatorId, indicatorId), eq(indicatorAssignees.userId, userId)))
      .limit(1);
    if (existing) return { success: true, alreadyExists: true };

    const [assignee] = await db
      .insert(indicatorAssignees)
      .values({ indicatorId, userId })
      .returning();
    return assignee;
  },

  async removeIndicatorAssignee(indicatorId: string, userId: string) {
    await resolveIndicator(indicatorId);
    await db
      .delete(indicatorAssignees)
      .where(and(eq(indicatorAssignees.indicatorId, indicatorId), eq(indicatorAssignees.userId, userId)));
    return { success: true };
  },

  // Update tracking

  async getIndicatorUpdates(indicatorId: string) {
    await resolveIndicator(indicatorId);
    return db
      .select({
        id: indicatorUpdates.id,
        indicatorId: indicatorUpdates.indicatorId,
        reportedDate: indicatorUpdates.reportedDate,
        reportedValue: indicatorUpdates.reportedValue,
        progressPct: indicatorUpdates.progressPct,
        note: indicatorUpdates.note,
        evidenceUrl: indicatorUpdates.evidenceUrl,
        reportedBy: indicatorUpdates.reportedBy,
        reporterName: users.name,
        createdAt: indicatorUpdates.createdAt,
      })
      .from(indicatorUpdates)
      .leftJoin(users, eq(indicatorUpdates.reportedBy, users.id))
      .where(eq(indicatorUpdates.indicatorId, indicatorId))
      .orderBy(desc(indicatorUpdates.reportedDate));
  },

  async createIndicatorUpdate(indicatorId: string, reportedBy: string, data: CreateIndicatorUpdateInput) {
    await resolveIndicator(indicatorId);
    if (!data.reportedDate?.trim()) throw new ValidationError('reportedDate is required');
    if (!data.reportedValue?.trim()) throw new ValidationError('reportedValue is required');

    const [update] = await db
      .insert(indicatorUpdates)
      .values({
        indicatorId,
        reportedBy,
        reportedDate: new Date(data.reportedDate),
        reportedValue: data.reportedValue,
        progressPct: data.progressPct,
        note: data.note,
        evidenceUrl: data.evidenceUrl,
      })
      .returning();
    return update;
  },

  // Progress aggregation

  async getPlanProgress(planId: string, period: ProgressPeriod = 'monthly') {
    const plan = await resolvePlan(planId);

    // fetch all strategies for this plan
    const strategyRows = await db
      .select()
      .from(strategies)
      .where(eq(strategies.planId, planId))
      .orderBy(asc(strategies.sortOrder));

    const strategyProgressList: StrategyProgress[] = [];
    let totalWeightSum = 0;
    let totalWeightedProgressSum = 0;

    for (const strat of strategyRows) {
      // fetch all goals for this strategy
      const goalRows = await db
        .select()
        .from(goals)
        .where(eq(goals.strategyId, strat.id))
        .orderBy(asc(goals.sortOrder));

      const goalProgressList: GoalProgress[] = [];

      for (const g of goalRows) {
        // fetch all indicators for this goal
        const indRows = await db
          .select()
          .from(indicators)
          .where(eq(indicators.goalId, g.id))
          .orderBy(asc(indicators.sortOrder));

        const indicatorProgressList: IndicatorProgress[] = [];

        for (const ind of indRows) {
          // pick the latest update within each period
          let periodLabel: string;
          let periodStart: Date;
          let periodEnd: Date;
          let fiscalYear: number;

          // fetch latest update for this indicator
          const [latestUpdate] = await db
            .select()
            .from(indicatorUpdates)
            .where(eq(indicatorUpdates.indicatorId, ind.id))
            .orderBy(desc(indicatorUpdates.reportedDate))
            .limit(1);

          if (latestUpdate) {
            const updateDate = latestUpdate.reportedDate;
            fiscalYear = getFiscalYear(updateDate);

            if (period === 'weekly') {
              const startOfYear = new Date(updateDate.getFullYear(), 0, 1);
              const dayOfYear = Math.floor((updateDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
              const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
              periodStart = new Date(`${updateDate.getFullYear()}-${String(week).padStart(2, '0')}-01`);
              periodEnd = new Date(periodStart);
              periodEnd.setDate(periodEnd.getDate() + 6);
              periodLabel = `สัปดาห์ที่ ${week}`;
            } else if (period === 'monthly') {
              const month = updateDate.getMonth() + 1;
              fiscalYear = getFiscalYear(updateDate);
              periodStart = new Date(`${updateDate.getFullYear()}-${String(month).padStart(2, '0')}-01`);
              periodEnd = new Date(updateDate.getFullYear(), month, 0);
              periodLabel = `${THAI_MONTHS_SHORT[month - 1]} ${fiscalYear}`;
            } else if (period === 'quarterly') {
              const q = getFiscalQuarter(updateDate);
              fiscalYear = getFiscalYear(updateDate);
              const qRanges: Record<number, { s: number; e: number }> = {
                1: { s: 10, e: 12 },
                2: { s: 1, e: 3 },
                3: { s: 4, e: 6 },
                4: { s: 7, e: 9 },
              };
              const r = qRanges[q];
              periodStart = new Date(`${updateDate.getFullYear()}-${String(r.s).padStart(2, '0')}-01`);
              periodEnd = new Date(updateDate.getFullYear(), r.e, 0);
              periodLabel = `ไตรมาสที่ ${q}`;
            } else {
              // yearly
              fiscalYear = getFiscalYear(updateDate);
              periodStart = new Date(`${updateDate.getFullYear() - 1}-10-01`);
              periodEnd = new Date(`${updateDate.getFullYear()}-09-30`);
              periodLabel = `ปีงบ ${fiscalYear}`;
            }
          } else {
            // no updates yet
            const now = new Date();
            fiscalYear = getFiscalYear(now);
            periodStart = now;
            periodEnd = now;
          }

          const weight = parseFloat(String(ind.weight ?? '1'));
          const pct = latestUpdate?.progressPct
            ? parseFloat(String(latestUpdate.progressPct))
            : latestUpdate ? parseFloat(String(latestUpdate.reportedValue)) / parseFloat(String(ind.targetValue)) * 100 : 0;

          indicatorProgressList.push({
            indicatorId: ind.id,
            indicatorCode: ind.code,
            indicatorName: ind.name,
            targetValue: String(ind.targetValue),
            unit: ind.unit ?? undefined,
            weight: String(ind.weight ?? '1'),
            latestValue: latestUpdate ? String(latestUpdate.reportedValue) : undefined,
            latestProgressPct: pct,
            periodLabel,
            periodStart,
            periodEnd,
          });
        }

        const goalWeightSum = indicatorProgressList.reduce((s, i) => s + parseFloat(i.weight), 0);
        const goalWeightedSum = indicatorProgressList.reduce(
          (s, i) => s + (i.latestProgressPct ?? 0) * parseFloat(i.weight),
          0,
        );

        goalProgressList.push({
          goalId: g.id,
          goalCode: g.code,
          goalName: g.name,
          indicators: indicatorProgressList,
          weightedProgress: goalWeightSum > 0 ? Math.round(goalWeightedSum / goalWeightSum) : 0,
          totalWeight: goalWeightSum,
        });

        totalWeightSum += goalWeightSum;
        totalWeightedProgressSum += goalWeightedSum;
      }

      const stratWeightSum = goalProgressList.reduce((s, g) => s + g.totalWeight, 0);
      const stratWeightedSum = goalProgressList.reduce(
        (s, g) => s + g.weightedProgress * g.totalWeight,
        0,
      );

      strategyProgressList.push({
        strategyId: strat.id,
        strategyCode: strat.code,
        strategyName: strat.name,
        goals: goalProgressList,
        weightedProgress: stratWeightSum > 0 ? Math.round(stratWeightedSum / stratWeightSum) : 0,
        totalWeight: stratWeightSum,
      });
    }

    return {
      planId,
      planYear: plan.year,
      period,
      strategies: strategyProgressList,
      overallProgress: totalWeightSum > 0 ? Math.round(totalWeightedProgressSum / totalWeightSum) : 0,
      totalWeight: totalWeightSum,
    } satisfies PlanProgress;
  },
};

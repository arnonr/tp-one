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
import { planIndicatorAuditLogs } from '../../db/schema/plan-indicator-audit-logs';
import { planStatusLogs } from '../../db/schema/plan-status-logs';
import { planItemStatusEnum } from '../../db/schema/plan-item-status';
import { eq, and, desc, asc, count, inArray, sql, gte, lte } from 'drizzle-orm';
import ExcelJS from 'exceljs';
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
  PlanExportData,
  MonthlyIndicatorUpdate,
} from './types';
import { generatePlanPDF } from './plan-pdf.service';
import { generatePlanExcel } from './plan-excel.service';

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

function getPeriodKey(date: Date, period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const y = date.getFullYear();
  if (period === 'weekly') {
    const startOfYear = new Date(y, 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, '0')}`;
  }
  if (period === 'monthly') {
    const m = date.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }
  if (period === 'quarterly') {
    const q = getFiscalQuarter(date);
    return `${y}-Q${q}`;
  }
  // yearly
  return `${y}`;
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
  // ===== Annual Plans =====

  async listPlans(fiscalYear?: number, status?: string) {
    let q = db.select().from(annualPlans);
    if (fiscalYear) {
      q = q.where(eq(annualPlans.year, fiscalYear));
    }
    if (status) {
      q = q.where(eq(annualPlans.status, status as any));
    }
    return q.orderBy(desc(annualPlans.year));
  },

  async getPlan(planId: string) {
    return resolvePlan(planId);
  },

  async createPlan(data: { year: number; name: string; description?: string }, createdById: string) {
    if (!data.year) throw new ValidationError('year is required');
    if (!data.name?.trim()) throw new ValidationError('name is required');

    const [plan] = await db
      .insert(annualPlans)
      .values({
        year: data.year,
        name: data.name.trim(),
        description: data.description?.trim(),
        createdById,
      })
      .returning();
    return plan;
  },

  async updatePlan(planId: string, data: { name?: string; description?: string; status?: string }) {
    await resolvePlan(planId);
    const [updated] = await db
      .update(annualPlans)
      .set({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.status !== undefined && { status: data.status as any }),
        updatedAt: new Date(),
      })
      .where(eq(annualPlans.id, planId))
      .returning();
    return updated;
  },

  async deletePlan(planId: string) {
    await resolvePlan(planId);
    await db.delete(annualPlans).where(eq(annualPlans.id, planId));
    return { success: true };
  },

  // Strategy CRUD

  async listStrategies(planId: string) {
    await resolvePlan(planId);

    const strategyRows = await db
      .select()
      .from(strategies)
      .where(eq(strategies.planId, planId))
      .orderBy(asc(strategies.sortOrder), asc(strategies.createdAt));

    if (strategyRows.length === 0) return [];

    const strategyIds = strategyRows.map(s => s.id);

    const goalRows = await db
      .select()
      .from(goals)
      .where(inArray(goals.strategyId, strategyIds))
      .orderBy(asc(goals.sortOrder), asc(goals.createdAt));

    const goalIds = goalRows.map(g => g.id);

    const indicatorRows = goalIds.length > 0
      ? await db
          .select()
          .from(indicators)
          .where(inArray(indicators.goalId, goalIds))
          .orderBy(asc(indicators.sortOrder), asc(indicators.createdAt))
      : [];

    const indicatorIds = indicatorRows.map(i => i.id);

    const assigneeRows = indicatorIds.length > 0
      ? await db
          .select({
            indicatorId: indicatorAssignees.indicatorId,
            userId: indicatorAssignees.userId,
            userName: users.name,
            userEmail: users.email,
          })
          .from(indicatorAssignees)
          .leftJoin(users, eq(indicatorAssignees.userId, users.id))
          .where(inArray(indicatorAssignees.indicatorId, indicatorIds))
      : [];

    // group indicators by goalId
    const indicatorsByGoal = new Map<string, typeof indicatorRows>();
    for (const ind of indicatorRows) {
      const list = indicatorsByGoal.get(ind.goalId) ?? [];
      list.push(ind);
      indicatorsByGoal.set(ind.goalId, list);
    }

    // group assignees by indicatorId
    const assigneesByIndicator = new Map<string, typeof assigneeRows>();
    for (const a of assigneeRows) {
      const list = assigneesByIndicator.get(a.indicatorId) ?? [];
      list.push(a);
      assigneesByIndicator.set(a.indicatorId, list);
    }

    // group goals by strategyId
    const goalsByStrategy = new Map<string, typeof goalRows>();
    for (const g of goalRows) {
      const list = goalsByStrategy.get(g.strategyId) ?? [];
      list.push(g);
      goalsByStrategy.set(g.strategyId, list);
    }

    return strategyRows.map(s => ({
      ...s,
      goals: (goalsByStrategy.get(s.id) ?? []).map(g => ({
        ...g,
        indicators: (indicatorsByGoal.get(g.id) ?? []).map(ind => ({
          ...ind,
          weight: parseFloat(String(ind.weight ?? '1')),
          targetValue: String(ind.targetValue),
          assignees: (assigneesByIndicator.get(ind.id) ?? []).map(a => ({
            id: a.userId,
            name: a.userName,
            email: a.userEmail,
          })),
        })),
      })),
    }));
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
        await db.delete(indicators).where(inArray(indicators.id, indIds));
      }
      // delete goals
      await db.delete(goals).where(eq(goals.strategyId, strategyId));
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

  async createIndicator(goalId: string, data: CreateIndicatorInput, createdById: string) {
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

    await db.insert(planIndicatorAuditLogs).values({
      indicatorId: indicator.id,
      changedBy: createdById,
      action: 'created',
      newValue: JSON.stringify({
        name: indicator.name,
        description: indicator.description,
        targetValue: indicator.targetValue,
        unit: indicator.unit,
        indicatorType: indicator.indicatorType,
        weight: indicator.weight,
        sortOrder: indicator.sortOrder,
      }),
    });

    return indicator;
  },

  async updateIndicator(indicatorId: string, data: UpdateIndicatorInput, updatedById: string) {
    const current = await resolveIndicator(indicatorId);

    const updates: Record<string, unknown> = {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.indicatorType !== undefined && { indicatorType: data.indicatorType as any }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(indicators)
      .set(updates)
      .where(eq(indicators.id, indicatorId))
      .returning();

    const trackableFields = ['name', 'description', 'targetValue', 'unit', 'indicatorType', 'weight', 'sortOrder'] as const;
    const auditEntries = trackableFields
      .filter((field) => data[field as keyof UpdateIndicatorInput] !== undefined)
      .map((field) => ({
        indicatorId,
        changedBy: updatedById,
        action: 'updated' as const,
        fieldName: field,
        oldValue: String(current[field as keyof typeof current] ?? ''),
        newValue: String(updated[field as keyof typeof updated] ?? ''),
      }));

    if (auditEntries.length > 0) {
      await db.insert(planIndicatorAuditLogs).values(auditEntries);
    }

    return updated;
  },

  async deleteIndicator(indicatorId: string, deletedById: string) {
    const indicator = await resolveIndicator(indicatorId);

    await db.insert(planIndicatorAuditLogs).values({
      indicatorId,
      changedBy: deletedById,
      action: 'deleted',
      oldValue: JSON.stringify({
        name: indicator.name,
        description: indicator.description,
        targetValue: indicator.targetValue,
        unit: indicator.unit,
        indicatorType: indicator.indicatorType,
        weight: indicator.weight,
        sortOrder: indicator.sortOrder,
      }),
    });

    // delete updates, assignees, audit logs, then indicator
    await db.delete(indicatorUpdates).where(eq(indicatorUpdates.indicatorId, indicatorId));
    await db.delete(indicatorAssignees).where(eq(indicatorAssignees.indicatorId, indicatorId));
    await db.delete(planIndicatorAuditLogs).where(eq(planIndicatorAuditLogs.indicatorId, indicatorId));
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

  async getIndicatorAuditLogs(indicatorId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [logs, [{ count: total }]] = await Promise.all([
      db
        .select({
          id: planIndicatorAuditLogs.id,
          indicatorId: planIndicatorAuditLogs.indicatorId,
          changedBy: planIndicatorAuditLogs.changedBy,
          changedByName: users.name,
          changedAt: planIndicatorAuditLogs.changedAt,
          action: planIndicatorAuditLogs.action,
          fieldName: planIndicatorAuditLogs.fieldName,
          oldValue: planIndicatorAuditLogs.oldValue,
          newValue: planIndicatorAuditLogs.newValue,
          reason: planIndicatorAuditLogs.reason,
        })
        .from(planIndicatorAuditLogs)
        .leftJoin(users, eq(planIndicatorAuditLogs.changedBy, users.id))
        .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId))
        .orderBy(desc(planIndicatorAuditLogs.changedAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: count() })
        .from(planIndicatorAuditLogs)
        .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId)),
    ]);

    return {
      data: logs,
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  },

  async revertIndicator(indicatorId: string, userId: string, auditLogId: string, reason: string) {
    const indicator = await resolveIndicator(indicatorId);

    const [auditLog] = await db
      .select()
      .from(planIndicatorAuditLogs)
      .where(and(
        eq(planIndicatorAuditLogs.id, auditLogId),
        eq(planIndicatorAuditLogs.indicatorId, indicatorId),
      ))
      .limit(1);
    if (!auditLog) throw new NotFoundError('Audit log', auditLogId);
    if (auditLog.action === 'deleted') throw new ValidationError('Cannot revert a deleted entry');

    const revertData: Record<string, unknown> = {};
    if (auditLog.fieldName && auditLog.oldValue !== null) {
      revertData[auditLog.fieldName] = auditLog.oldValue;
    } else if (!auditLog.fieldName && auditLog.oldValue) {
      const oldValues = JSON.parse(auditLog.oldValue);
      if (oldValues.name !== undefined) revertData.name = oldValues.name;
      if (oldValues.targetValue !== undefined) revertData.targetValue = oldValues.targetValue;
      if (oldValues.unit !== undefined) revertData.unit = oldValues.unit;
      if (oldValues.description !== undefined) revertData.description = oldValues.description;
      if (oldValues.indicatorType !== undefined) revertData.indicatorType = oldValues.indicatorType;
      if (oldValues.weight !== undefined) revertData.weight = oldValues.weight;
      if (oldValues.sortOrder !== undefined) revertData.sortOrder = oldValues.sortOrder;
    }

    if (Object.keys(revertData).length === 0) {
      throw new ValidationError('Nothing to revert');
    }

    const [updated] = await db
      .update(indicators)
      .set({ ...revertData, updatedAt: new Date() } as any)
      .where(eq(indicators.id, indicatorId))
      .returning();

    await db.insert(planIndicatorAuditLogs).values({
      indicatorId,
      changedBy: userId,
      action: 'reverted',
      oldValue: JSON.stringify({
        name: indicator.name,
        targetValue: indicator.targetValue,
        unit: indicator.unit,
        description: indicator.description,
      }),
      newValue: JSON.stringify(revertData),
      reason,
    });

    return updated;
  },

  async exportAuditLogs(indicatorId: string): Promise<Buffer> {
    const logs = await db
      .select({
        changedAt: planIndicatorAuditLogs.changedAt,
        changedByName: users.name,
        action: planIndicatorAuditLogs.action,
        fieldName: planIndicatorAuditLogs.fieldName,
        oldValue: planIndicatorAuditLogs.oldValue,
        newValue: planIndicatorAuditLogs.newValue,
        reason: planIndicatorAuditLogs.reason,
      })
      .from(planIndicatorAuditLogs)
      .leftJoin(users, eq(planIndicatorAuditLogs.changedBy, users.id))
      .where(eq(planIndicatorAuditLogs.indicatorId, indicatorId))
      .orderBy(desc(planIndicatorAuditLogs.changedAt));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Audit Log');

    ws.columns = [
      { header: 'วันที่', key: 'date', width: 18 },
      { header: 'ผู้เปลี่ยนแปลง', key: 'user', width: 20 },
      { header: 'การกระทำ', key: 'action', width: 14 },
      { header: 'ฟิลด์', key: 'field', width: 16 },
      { header: 'ค่าเดิม', key: 'oldVal', width: 30 },
      { header: 'ค่าใหม่', key: 'newVal', width: 30 },
      { header: 'เหตุผล', key: 'reason', width: 30 },
    ];

    const actionLabels: Record<string, string> = {
      created: 'สร้าง',
      updated: 'แก้ไข',
      deleted: 'ลบ',
      reverted: 'กู้คืน',
    };

    const fieldLabels: Record<string, string> = {
      name: 'ชื่อ',
      description: 'รายละเอียด',
      targetValue: 'ค่าเป้าหมาย',
      unit: 'หน่วย',
      indicatorType: 'ประเภท',
      weight: 'น้ำหนัก',
      sortOrder: 'ลำดับ',
    };

    const buddhistYear = (d: Date) => {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    };

    for (const log of logs) {
      ws.addRow({
        date: buddhistYear(new Date(log.changedAt)),
        user: log.changedByName ?? '-',
        action: actionLabels[log.action] ?? log.action,
        field: log.fieldName ? (fieldLabels[log.fieldName] ?? log.fieldName) : '-',
        oldVal: log.oldValue ?? '-',
        newVal: log.newValue ?? '-',
        reason: log.reason ?? '-',
      });
    }

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
          // fetch all updates for this indicator within the plan year
          const allUpdates = await db
            .select()
            .from(indicatorUpdates)
            .where(eq(indicatorUpdates.indicatorId, ind.id))
            .orderBy(desc(indicatorUpdates.reportedDate));

          // group updates by period and pick the latest within each group
          const updatesByPeriod = new Map<string, typeof allUpdates[0]>();
          for (const upd of allUpdates) {
            const key = getPeriodKey(upd.reportedDate, period);
            if (!updatesByPeriod.has(key)) {
              updatesByPeriod.set(key, upd);
            }
          }

          // derive period metadata from the latest update in the most recent period
          const sortedKeys = [...updatesByPeriod.keys()].sort();
          const latestGroupKey = sortedKeys[sortedKeys.length - 1];
          const latestUpdate = latestGroupKey ? updatesByPeriod.get(latestGroupKey)! : null;
          let periodLabel = '';
          let periodStart = new Date();
          let periodEnd = new Date();
          const fiscalYear = latestUpdate ? getFiscalYear(latestUpdate.reportedDate) : getFiscalYear(new Date());

          if (latestUpdate) {
            const d = latestUpdate.reportedDate;
            if (period === 'weekly') {
              const startOfYear = new Date(d.getFullYear(), 0, 1);
              const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
              const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
              periodStart = new Date(d.getFullYear(), 0, 1 + (week - 1) * 7);
              periodEnd = new Date(periodStart);
              periodEnd.setDate(periodEnd.getDate() + 6);
              periodLabel = `สัปดาห์ที่ ${week}`;
            } else if (period === 'monthly') {
              const month = d.getMonth() + 1;
              periodStart = new Date(d.getFullYear(), month - 1, 1);
              periodEnd = new Date(d.getFullYear(), month, 0);
              periodLabel = `${THAI_MONTHS_SHORT[month - 1]} ${fiscalYear}`;
            } else if (period === 'quarterly') {
              const q = getFiscalQuarter(d);
              const qRanges: Record<number, { s: number; e: number }> = {
                1: { s: 10, e: 12 },
                2: { s: 1, e: 3 },
                3: { s: 4, e: 6 },
                4: { s: 7, e: 9 },
              };
              const r = qRanges[q];
              periodStart = new Date(d.getFullYear(), r.s - 1, 1);
              periodEnd = new Date(d.getFullYear(), r.e, 0);
              periodLabel = `ไตรมาสที่ ${q}`;
            } else {
              // yearly
              periodStart = new Date(d.getFullYear() - 1, 9, 1); // Oct 1 of prev calendar year
              periodEnd = new Date(d.getFullYear(), 8, 30); // Sep 30 of current calendar year
              periodLabel = `ปีงบ ${fiscalYear}`;
            }
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

  async getPlanExportData(planId: string, period: ProgressPeriod = 'monthly'): Promise<PlanExportData> {
    const plan = await resolvePlan(planId);
    const progress = await planService.getPlanProgress(planId, period);

    // Collect indicator IDs from progress data (plan-scoped)
    const indicatorIds = progress.strategies.flatMap(s =>
      s.goals.flatMap(g => g.indicators.map(i => i.indicatorId)),
    );

    if (indicatorIds.length === 0) {
      return {
        plan: { id: plan.id, year: plan.year, name: plan.name, description: plan.description ?? undefined, status: plan.status },
        progress,
        monthlyUpdates: [],
      };
    }

    // Fiscal year date range (CE)
    const ceYear = plan.year - 543;
    const fyStartCE = new Date(ceYear - 1, 9, 1);  // Oct 1
    const fyEndCE = new Date(ceYear, 8, 30);        // Sep 30

    const allUpdates = await db
      .select({
        indicatorId: indicatorUpdates.indicatorId,
        reportedDate: indicatorUpdates.reportedDate,
        reportedValue: indicatorUpdates.reportedValue,
        progressPct: indicatorUpdates.progressPct,
      })
      .from(indicatorUpdates)
      .where(
        and(
          inArray(indicatorUpdates.indicatorId, indicatorIds),
          gte(indicatorUpdates.reportedDate, fyStartCE),
          lte(indicatorUpdates.reportedDate, fyEndCE),
        ),
      )
      .orderBy(desc(indicatorUpdates.reportedDate));

    // Build indicator lookup from progress data
    const indMap = new Map<string, { code: string; name: string; targetValue: string }>();
    for (const strat of progress.strategies) {
      for (const goal of strat.goals) {
        for (const ind of goal.indicators) {
          indMap.set(ind.indicatorId, {
            code: ind.indicatorCode,
            name: ind.indicatorName,
            targetValue: ind.targetValue,
          });
        }
      }
    }

    // Group by indicator+month, keep latest per group
    const monthlyMap = new Map<string, MonthlyIndicatorUpdate>();
    for (const upd of allUpdates) {
      const ind = indMap.get(upd.indicatorId);
      if (!ind) continue;
      const reportedDate = typeof upd.reportedDate === 'string' ? new Date(upd.reportedDate) : upd.reportedDate;
      const month = reportedDate.getMonth() + 1;
      const key = `${upd.indicatorId}-${month}`;
      if (!monthlyMap.has(key)) {
        const target = parseFloat(ind.targetValue) || 0;
        const reported = parseFloat(upd.reportedValue) || 0;
        monthlyMap.set(key, {
          indicatorId: upd.indicatorId,
          indicatorCode: ind.code,
          indicatorName: ind.name,
          month,
          fiscalYear: plan.year,
          reportedValue: reported,
          targetValue: target,
          progressPct: upd.progressPct ? parseFloat(upd.progressPct) : (target > 0 ? Math.round((reported / target) * 100) : 0),
        });
      }
    }

    return {
      plan: { id: plan.id, year: plan.year, name: plan.name, description: plan.description ?? undefined, status: plan.status },
      progress,
      monthlyUpdates: [...monthlyMap.values()],
    };
  },

  // Status management

  async updateStrategyStatus(strategyId: string, newStatus: string, changedBy: string, reason?: string) {
    const strategy = await resolveStrategy(strategyId);
    if (!planItemStatusEnum.enumValues.includes(newStatus as any)) {
      throw new ValidationError('Invalid status value');
    }
    await db
      .update(strategies)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(strategies.id, strategyId));
    await db.insert(planStatusLogs).values({
      entityType: 'strategy',
      entityId: strategyId,
      oldStatus: strategy.status,
      newStatus: newStatus as any,
      changedBy,
      reason,
    });
    return resolveStrategy(strategyId);
  },

  async updateGoalStatus(goalId: string, newStatus: string, changedBy: string, reason?: string) {
    const goal = await resolveGoal(goalId);
    if (!planItemStatusEnum.enumValues.includes(newStatus as any)) {
      throw new ValidationError('Invalid status value');
    }
    await db
      .update(goals)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(goals.id, goalId));
    await db.insert(planStatusLogs).values({
      entityType: 'goal',
      entityId: goalId,
      oldStatus: goal.status,
      newStatus: newStatus as any,
      changedBy,
      reason,
    });
    return resolveGoal(goalId);
  },

  async updateIndicatorStatus(indicatorId: string, newStatus: string, changedBy: string, reason?: string) {
    const indicator = await resolveIndicator(indicatorId);
    if (!planItemStatusEnum.enumValues.includes(newStatus as any)) {
      throw new ValidationError('Invalid status value');
    }
    await db
      .update(indicators)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(indicators.id, indicatorId));
    await db.insert(planStatusLogs).values({
      entityType: 'indicator',
      entityId: indicatorId,
      oldStatus: indicator.status,
      newStatus: newStatus as any,
      changedBy,
      reason,
    });
    return resolveIndicator(indicatorId);
  },

  async getStatusLogs(entityType: string, entityId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const condition = and(
      eq(planStatusLogs.entityType, entityType),
      eq(planStatusLogs.entityId, entityId),
    );
    const [logs, [{ count: total }]] = await Promise.all([
      db
        .select({
          id: planStatusLogs.id,
          entityType: planStatusLogs.entityType,
          entityId: planStatusLogs.entityId,
          oldStatus: planStatusLogs.oldStatus,
          newStatus: planStatusLogs.newStatus,
          changedBy: planStatusLogs.changedBy,
          changedByName: users.name,
          changedAt: planStatusLogs.changedAt,
          reason: planStatusLogs.reason,
        })
        .from(planStatusLogs)
        .leftJoin(users, eq(planStatusLogs.changedBy, users.id))
        .where(condition)
        .orderBy(desc(planStatusLogs.changedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(planStatusLogs).where(condition),
    ]);
    return {
      data: logs,
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    };
  },

  async exportPlanPDF(planId: string, period: ProgressPeriod = 'monthly'): Promise<Buffer> {
    const data = await planService.getPlanExportData(planId, period);
    return generatePlanPDF(data);
  },

  async exportPlanExcel(planId: string, period: ProgressPeriod = 'monthly'): Promise<Buffer> {
    const data = await planService.getPlanExportData(planId, period);
    return generatePlanExcel(data);
  },
};

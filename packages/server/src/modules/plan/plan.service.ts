import { db } from '../../config/database';
import {
  annualPlans,
  planCategories,
  planIndicators,
  indicatorUpdates,
  planStatusEnum,
  indicatorTypeEnum,
} from '../../db/schema/annual-plans';
import { users } from '../../db/schema/users';
import { eq, and, desc, asc, count, sql, inArray } from 'drizzle-orm';
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors';
import type { GlobalRole } from '../../shared/constants';

// ===== helpers =====

async function resolvePlan(planId: string) {
  const [p] = await db.select().from(annualPlans).where(eq(annualPlans.id, planId)).limit(1);
  if (!p) throw new NotFoundError('Plan', planId);
  return p;
}

async function resolveCategory(categoryId: string) {
  const [c] = await db.select().from(planCategories).where(eq(planCategories.id, categoryId)).limit(1);
  if (!c) throw new NotFoundError('Category', categoryId);
  return c;
}

// ===== Plan =====

export const planService = {
  async list(fiscalYear?: number, status?: string) {
    const conditions = [];
    if (fiscalYear) conditions.push(eq(annualPlans.year, fiscalYear));
    if (status) conditions.push(eq(annualPlans.status, status as any));

    const data = await db
      .select({
        id: annualPlans.id,
        year: annualPlans.year,
        name: annualPlans.name,
        description: annualPlans.description,
        status: annualPlans.status,
        createdById: annualPlans.createdById,
        createdAt: annualPlans.createdAt,
        updatedAt: annualPlans.updatedAt,
        creatorName: users.name,
      })
      .from(annualPlans)
      .leftJoin(users, eq(annualPlans.createdById, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(annualPlans.year));

    // count categories + indicators per plan
    const planIds = data.map(p => p.id);
    const categoryCounts = await db
      .select({ planId: planCategories.planId, cnt: count() })
      .from(planCategories)
      .where(inArray(planCategories.planId, planIds))
      .groupBy(planCategories.planId);

    const indicatorCounts = await db
      .select({ planId: planCategories.planId, cnt: count() })
      .from(planIndicators)
      .innerJoin(planCategories, eq(planIndicators.categoryId, planCategories.id))
      .where(inArray(planCategories.planId, planIds))
      .groupBy(planCategories.planId);

    const catCountMap = Object.fromEntries(categoryCounts.map(r => [r.planId, Number(r.cnt)]));
    const indCountMap = Object.fromEntries(indicatorCounts.map(r => [r.planId, Number(r.cnt)]));

    return data.map(p => ({
      ...p,
      categoryCount: catCountMap[p.id] || 0,
      indicatorCount: indCountMap[p.id] || 0,
    }));
  },

  async getById(planId: string) {
    const [plan] = await db
      .select({
        id: annualPlans.id,
        year: annualPlans.year,
        name: annualPlans.name,
        description: annualPlans.description,
        status: annualPlans.status,
        createdById: annualPlans.createdById,
        createdAt: annualPlans.createdAt,
        updatedAt: annualPlans.updatedAt,
        creatorName: users.name,
      })
      .from(annualPlans)
      .leftJoin(users, eq(annualPlans.createdById, users.id))
      .where(eq(annualPlans.id, planId))
      .limit(1);

    if (!plan) throw new NotFoundError('Plan', planId);

    const categories = await db
      .select({
        id: planCategories.id,
        planId: planCategories.planId,
        code: planCategories.code,
        name: planCategories.name,
        sortOrder: planCategories.sortOrder,
      })
      .from(planCategories)
      .where(eq(planCategories.planId, planId))
      .orderBy(asc(planCategories.sortOrder));

    const categoryIds = categories.map(c => c.id);

    // fetch indicators per category
    const indicatorsByCategory: Record<string, unknown[]> = {};
    if (categoryIds.length > 0) {
      const indRows = await db
        .select({
          id: planIndicators.id,
          categoryId: planIndicators.categoryId,
          code: planIndicators.code,
          name: planIndicators.name,
          description: planIndicators.description,
          targetValue: planIndicators.targetValue,
          unit: planIndicators.unit,
          indicatorType: planIndicators.indicatorType,
          assigneeId: planIndicators.assigneeId,
          assigneeName: users.name,
          sortOrder: planIndicators.sortOrder,
        })
        .from(planIndicators)
        .leftJoin(users, eq(planIndicators.assigneeId, users.id))
        .where(inArray(planIndicators.categoryId, categoryIds))
        .orderBy(asc(planIndicators.sortOrder));

      for (const ind of indRows) {
        if (!indicatorsByCategory[ind.categoryId]) indicatorsByCategory[ind.categoryId] = [];
        indicatorsByCategory[ind.categoryId].push(ind);
      }
    }

    return {
      ...plan,
      categories: categories.map(c => ({
        ...c,
        indicators: indicatorsByCategory[c.id] || [],
      })),
    };
  },

  async create(data: { year: number; name: string; description?: string; status?: string; createdById: string }) {
    if (!data.year || !data.name) throw new ValidationError('year และ name จำเป็น');
    const [plan] = await db
      .insert(annualPlans)
      .values({
        year: data.year,
        name: data.name,
        description: data.description,
        status: (data.status || 'draft') as any,
        createdById: data.createdById,
      })
      .returning();
    return plan;
  },

  async update(planId: string, data: { name?: string; description?: string; status?: string }) {
    await resolvePlan(planId);
    const [updated] = await db
      .update(annualPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(annualPlans.id, planId))
      .returning();
    return updated;
  },

  async delete(planId: string, userRole: GlobalRole) {
    const plan = await resolvePlan(planId);
    if (plan.status !== 'draft' && userRole !== 'admin') {
      throw new ForbiddenError('เฉพาะสถานะ draft หรือ admin เท่านั้นที่ลบได้');
    }
    // cascade delete indicators then categories then plan
    const cats = await db.select({ id: planCategories.id }).from(planCategories).where(eq(planCategories.planId, planId));
    const catIds = cats.map(c => c.id);
    if (catIds.length) {
      const inds = await db.select({ id: planIndicators.id }).from(planIndicators).where(inArray(planIndicators.categoryId, catIds));
      const indIds = inds.map(i => i.id);
      if (indIds.length) await db.delete(indicatorUpdates).where(inArray(indicatorUpdates.indicatorId, indIds));
      if (catIds.length) await db.delete(planIndicators).where(inArray(planIndicators.categoryId, catIds));
    }
    if (catIds.length) await db.delete(planCategories).where(inArray(planCategories.planId, planId));
    await db.delete(annualPlans).where(eq(annualPlans.id, planId));
    return { success: true };
  },

  // ===== Category =====

  async getCategories(planId: string) {
    await resolvePlan(planId);
    return db
      .select({ id: planCategories.id, planId: planCategories.planId, code: planCategories.code, name: planCategories.name, sortOrder: planCategories.sortOrder })
      .from(planCategories)
      .where(eq(planCategories.planId, planId))
      .orderBy(asc(planCategories.sortOrder));
  },

  async createCategory(planId: string, data: { code: string; name: string; sortOrder?: number }) {
    await resolvePlan(planId);
    const [cat] = await db.insert(planCategories).values({ planId, code: data.code, name: data.name, sortOrder: data.sortOrder ?? 0 }).returning();
    return cat;
  },

  async updateCategory(categoryId: string, data: { code?: string; name?: string; sortOrder?: number }) {
    await resolveCategory(categoryId);
    const [updated] = await db.update(planCategories).set(data).where(eq(planCategories.id, categoryId)).returning();
    return updated;
  },

  async deleteCategory(categoryId: string) {
    await resolveCategory(categoryId);
    const inds = await db.select({ id: planIndicators.id }).from(planIndicators).where(eq(planIndicators.categoryId, categoryId));
    const indIds = inds.map(i => i.id);
    if (indIds.length) await db.delete(indicatorUpdates).where(inArray(indicatorUpdates.indicatorId, indIds));
    await db.delete(planIndicators).where(eq(planIndicators.categoryId, categoryId));
    await db.delete(planCategories).where(eq(planCategories.id, categoryId));
    return { success: true };
  },

  // ===== Indicator =====

  async getIndicators(categoryId: string) {
    await resolveCategory(categoryId);
    return db
      .select({
        id: planIndicators.id,
        categoryId: planIndicators.categoryId,
        code: planIndicators.code,
        name: planIndicators.name,
        description: planIndicators.description,
        targetValue: planIndicators.targetValue,
        unit: planIndicators.unit,
        indicatorType: planIndicators.indicatorType,
        assigneeId: planIndicators.assigneeId,
        assigneeName: users.name,
        sortOrder: planIndicators.sortOrder,
      })
      .from(planIndicators)
      .leftJoin(users, eq(planIndicators.assigneeId, users.id))
      .where(eq(planIndicators.categoryId, categoryId))
      .orderBy(asc(planIndicators.sortOrder));
  },

  async getIndicatorById(indicatorId: string) {
    const [ind] = await db
      .select({
        id: planIndicators.id,
        categoryId: planIndicators.categoryId,
        code: planIndicators.code,
        name: planIndicators.name,
        description: planIndicators.description,
        targetValue: planIndicators.targetValue,
        unit: planIndicators.unit,
        indicatorType: planIndicators.indicatorType,
        assigneeId: planIndicators.assigneeId,
        assigneeName: users.name,
        sortOrder: planIndicators.sortOrder,
      })
      .from(planIndicators)
      .leftJoin(users, eq(planIndicators.assigneeId, users.id))
      .where(eq(planIndicators.id, indicatorId))
      .limit(1);
    if (!ind) throw new NotFoundError('Indicator', indicatorId);
    return ind;
  },

  async createIndicator(categoryId: string, data: {
    code: string;
    name: string;
    description?: string;
    targetValue: string;
    unit?: string;
    indicatorType?: string;
    assigneeId?: string;
    sortOrder?: number;
  }) {
    await resolveCategory(categoryId);
    const [ind] = await db.insert(planIndicators).values({
      categoryId,
      code: data.code,
      name: data.name,
      description: data.description,
      targetValue: data.targetValue,
      unit: data.unit,
      indicatorType: (data.indicatorType || 'amount') as any,
      assigneeId: data.assigneeId,
      sortOrder: data.sortOrder ?? 0,
    }).returning();
    return ind;
  },

  async updateIndicator(indicatorId: string, data: {
    code?: string;
    name?: string;
    description?: string;
    targetValue?: string;
    unit?: string;
    indicatorType?: string;
    assigneeId?: string;
    sortOrder?: number;
  }) {
    await this.getIndicatorById(indicatorId);
    const [updated] = await db.update(planIndicators).set(data).where(eq(planIndicators.id, indicatorId)).returning();
    return updated;
  },

  async deleteIndicator(indicatorId: string) {
    await this.getIndicatorById(indicatorId);
    await db.delete(indicatorUpdates).where(eq(indicatorUpdates.indicatorId, indicatorId));
    await db.delete(planIndicators).where(eq(planIndicators.id, indicatorId));
    return { success: true };
  },

  // ===== Indicator Update =====

  async getUpdates(indicatorId: string) {
    await this.getIndicatorById(indicatorId);
    return db
      .select({
        id: indicatorUpdates.id,
        indicatorId: indicatorUpdates.indicatorId,
        reportedValue: indicatorUpdates.reportedValue,
        reportedMonth: indicatorUpdates.reportedMonth,
        reportedYear: indicatorUpdates.reportedYear,
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
      .orderBy(asc(indicatorUpdates.reportedYear), asc(indicatorUpdates.reportedMonth));
  },

  async createUpdate(indicatorId: string, reportedBy: string, data: {
    reportedValue: string;
    reportedMonth: number;
    reportedYear: number;
    progressPct?: string;
    note?: string;
    evidenceUrl?: string;
  }) {
    await this.getIndicatorById(indicatorId);
    const [upd] = await db.insert(indicatorUpdates).values({
      indicatorId,
      reportedBy,
      reportedValue: data.reportedValue,
      reportedMonth: data.reportedMonth,
      reportedYear: data.reportedYear,
      progressPct: data.progressPct,
      note: data.note,
      evidenceUrl: data.evidenceUrl,
    }).returning();
    return upd;
  },

  async deleteUpdate(updateId: string, userId: string, userRole: GlobalRole) {
    const [upd] = await db.select().from(indicatorUpdates).where(eq(indicatorUpdates.id, updateId)).limit(1);
    if (!upd) throw new NotFoundError('IndicatorUpdate', updateId);
    if (upd.reportedBy !== userId && userRole !== 'admin') {
      throw new ForbiddenError('ไม่สามารถลบรายงานของผู้อื่น');
    }
    await db.delete(indicatorUpdates).where(eq(indicatorUpdates.id, updateId));
    return { success: true };
  },

  // ===== Progress Calculation =====

  async calculatePlanProgress(planId: string) {
    const plan = await this.getById(planId);
    let totalWeight = 0;
    let totalWeightedPct = 0;
    const byCategory: Record<string, number> = {};

    for (const cat of plan.categories) {
      let catWeight = 0;
      let catWeightedPct = 0;

      for (const ind of cat.indicators as any[]) {
        // get latest update ordered by year desc, month desc
        const [latest] = await db
          .select({ progressPct: indicatorUpdates.progressPct })
          .from(indicatorUpdates)
          .where(eq(indicatorUpdates.indicatorId, ind.id))
          .orderBy(desc(indicatorUpdates.reportedYear), desc(indicatorUpdates.reportedMonth))
          .limit(1);

        const weight = parseFloat(String(ind.weight || '1'));
        const pct = latest ? parseFloat(latest.progressPct || '0') : 0;
        catWeight += weight;
        catWeightedPct += pct * weight;
      }

      if (catWeight > 0) {
        byCategory[cat.id] = Math.round(catWeightedPct / catWeight);
        totalWeight += catWeight;
        totalWeightedPct += catWeightedPct;
      }
    }

    return {
      progress: totalWeight > 0 ? Math.round(totalWeightedPct / totalWeight) : 0,
      byCategory,
    };
  },
};
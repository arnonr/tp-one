# Annual Plan Hierarchy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนโครงสร้าง Annual Plan จาก 3 ระดับ (Plan → Category → Indicator) เป็น 4 ระดับ (Plan → Strategy → Goal → Indicator) พร้อม auto-code generation, ผู้รับผิดชอบหลายคนต่อตัวชี้วัด และ date-based updates

**Architecture:** แยกตาราง strategies/goals/indicators/indicator_assignees + indicator_updates ใช้ reportedDate แทน reportedMonth/reportedYear

**Tech Stack:** Drizzle ORM, ElysiaJS, Vue 3 + Naive UI, ECharts, Thai date utils

---

## File Map

```
packages/server/src/db/schema/
├── annual-plans.ts     # MODIFY: keep annualPlans, drop planCategories, planIndicators, indicatorUpdates (replaced by new tables)
├── strategies.ts       # NEW: strategies table (replaces planCategories role)
├── goals.ts           # NEW: goals table
├── indicators.ts      # NEW: indicators table + indicator_assignees junction
├── indicator-updates.ts # NEW: indicator_updates with reportedDate
└── index.ts           # MODIFY: export new tables

packages/server/src/modules/plan/
├── plan.service.ts     # REWRITE: full service for all 4 levels + assignees
├── plan.controller.ts  # REWRITE: all endpoints
├── plan.plugin.ts     # MODIFY: register new routes
└── types.ts           # NEW: TypeScript types

packages/server/src/shared/thai.utils.ts  # ADD: fiscal quarter/week helpers

packages/server/src/db/seed.ts  # MODIFY: seed data for new schema

packages/web/src/components/plan/
├── strategy/
│   ├── StrategyList.vue     # NEW
│   ├── StrategyForm.vue     # NEW
│   └── StrategyCard.vue     # NEW
├── goal/
│   ├── GoalList.vue         # NEW
│   ├── GoalForm.vue        # NEW
│   └── GoalCard.vue        # NEW
├── IndicatorAssignees.vue   # NEW
├── IndicatorUpdateForm.vue # MODIFY: use reportedDate
├── IndicatorChart.vue      # NEW
└── ProgressReport.vue      # NEW

packages/web/src/views/
└── PlanDetailView.vue      # MODIFY: nested Strategy → Goal → Indicator UI
```

---

## Tasks

### Task 1: Database Schemas

**Files:**
- Create: `packages/server/src/db/schema/strategies.ts`
- Create: `packages/server/src/db/schema/goals.ts`
- Create: `packages/server/src/db/schema/indicators.ts`
- Create: `packages/server/src/db/schema/indicator-updates.ts`
- Modify: `packages/server/src/db/schema/annual-plans.ts` — remove old planCategories, planIndicators, indicatorUpdates
- Modify: `packages/server/src/db/schema/index.ts` — export new tables
- Modify: `packages/server/src/db/seed.ts` — seed strategies and goals

- [ ] **Step 1: Create strategies.ts**

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { annualPlans } from './annual-plans';
import { relations } from 'drizzle-orm';

export const strategies = pgTable('strategies', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').references(() => annualPlans.id).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_strategies_plan').on(table.planId),
]);

export const strategyRelations = relations(strategies, ({ one, many }) => ({
  plan: one(annualPlans, { fields: [strategies.planId], references: [annualPlans.id] }),
  goals: many(goals),
}));
```

- [ ] **Step 2: Create goals.ts**

```typescript
import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { strategies } from './strategies';
import { relations } from 'drizzle-orm';

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  strategyId: uuid('strategy_id').references(() => strategies.id).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_goals_strategy').on(table.strategyId),
]);

export const goalRelations = relations(goals, ({ one, many }) => ({
  strategy: one(strategies, { fields: [goals.strategyId], references: [strategies.id] }),
  indicators: many(indicators),
}));
```

- [ ] **Step 3: Create indicators.ts**

```typescript
import { pgTable, uuid, varchar, text, numeric, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { goals } from './goals';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const indicatorTypeEnum = pgEnum('indicator_type', ['amount', 'count', 'percentage']);

export const indicators = pgTable('indicators', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').references(() => goals.id).notNull(),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  targetValue: numeric('target_value', { precision: 15, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 50 }),
  indicatorType: indicatorTypeEnum('indicator_type').default('amount').notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).default('1'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_indicators_goal').on(table.goalId),
]);

export const indicatorAssignees = pgTable('indicator_assignees', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id').references(() => indicators.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
}, (table) => [
  index('idx_indicator_assignees_indicator').on(table.indicatorId),
  index('idx_indicator_assignees_user').on(table.userId),
]);

export const indicatorRelations = relations(indicators, ({ one, many }) => ({
  goal: one(goals, { fields: [indicators.goalId], references: [goals.id] }),
  assignees: many(indicatorAssignees),
  updates: many(indicatorUpdates),
}));

export const indicatorAssigneeRelations = relations(indicatorAssignees, ({ one }) => ({
  indicator: one(indicators, { fields: [indicatorAssignees.indicatorId], references: [indicators.id] }),
  user: one(users, { fields: [indicatorAssignees.userId], references: [users.id] }),
}));
```

- [ ] **Step 4: Create indicator-updates.ts**

```typescript
import { pgTable, uuid, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { indicators } from './indicators';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const indicatorUpdates = pgTable('indicator_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id').references(() => indicators.id).notNull(),
  reportedDate: timestamp('reported_date', { withTimezone: true }).notNull(),
  reportedValue: numeric('reported_value', { precision: 15, scale: 2 }).notNull(),
  progressPct: numeric('progress_pct', { precision: 5, scale: 2 }),
  note: text('note'),
  evidenceUrl: varchar('evidence_url', { length: 500 }),
  reportedBy: uuid('reported_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_indicator_updates_indicator').on(table.indicatorId),
  index('idx_indicator_updates_date').on(table.indicatorId, table.reportedDate),
]);

export const indicatorUpdateRelations = relations(indicatorUpdates, ({ one }) => ({
  indicator: one(indicators, { fields: [indicatorUpdates.indicatorId], references: [indicators.id] }),
  reporter: one(users, { fields: [indicatorUpdates.reportedBy], references: [users.id] }),
}));
```

- [ ] **Step 5: Run migration**

```bash
cd /Users/tongfreedom/projects/tp-one && bun run db:generate
```

Expected: new migration files created for strategies, goals, indicators, indicator_updates, indicator_assignees

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/db/schema/
git commit -m "feat: add 4-level annual plan schema (Strategy → Goal → Indicator)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Backend Service & Controller

**Files:**
- Rewrite: `packages/server/src/modules/plan/plan.service.ts`
- Rewrite: `packages/server/src/modules/plan/plan.controller.ts`
- Modify: `packages/server/src/modules/plan/plan.plugin.ts`
- Create: `packages/server/src/modules/plan/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
import type { GlobalRole } from '../../shared/constants';

export interface CreateStrategyInput { name: string; description?: string; sortOrder?: number; }
export interface UpdateStrategyInput { name?: string; description?: string; sortOrder?: number; }
export interface CreateGoalInput { strategyId: string; name: string; description?: string; sortOrder?: number; }
export interface UpdateGoalInput { name?: string; description?: string; sortOrder?: number; }
export interface CreateIndicatorInput {
  goalId: string; name: string; description?: string; targetValue: string; unit?: string;
  indicatorType?: string; weight?: string; sortOrder?: number;
}
export interface UpdateIndicatorInput {
  name?: string; description?: string; targetValue?: string; unit?: string;
  indicatorType?: string; weight?: string; sortOrder?: number;
}
export interface CreateIndicatorUpdateInput {
  reportedDate: string; reportedValue: string; progressPct?: string; note?: string; evidenceUrl?: string;
}
export interface PlanProgressQuery { period: 'weekly' | 'monthly' | 'quarterly' | 'yearly'; fiscalYear?: number; }
```

- [ ] **Step 2: Rewrite plan.service.ts** (full file with all CRUD + assignees + report aggregation)

Key methods:
- `listStrategies(planId)`, `createStrategy`, `updateStrategy`, `deleteStrategy`
- `listGoals(strategyId)`, `createGoal`, `updateGoal`, `deleteGoal`
- `listIndicators(goalId)`, `createIndicator`, `updateIndicator`, `deleteIndicator`
- `getIndicatorAssignees(indicatorId)`, `addIndicatorAssignee`, `removeIndicatorAssignee`
- `getIndicatorUpdates(indicatorId)`, `createIndicatorUpdate`
- `getPlanProgress(planId, period)` — aggregates by period from reportedDate

Auto-code logic:
- Strategy code: `S${sortOrder}` (next available number)
- Goal code: `{strategyCode}-G${sortOrder}`
- Indicator code: `{goalCode}-K${String(sortOrder).padStart(2, '0')}`

Report aggregation:
- Extract fiscal quarter/month/year from reportedDate using Thai fiscal utils
- For each period, pick latest update per indicator

- [ ] **Step 3: Rewrite plan.controller.ts** with all endpoints from spec Section 3

- [ ] **Step 4: Run tests**

```bash
cd /Users/tongfreedom/projects/tp-one/packages/server && bun test
```

Expected: all pass (or new tests for new endpoints)

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/modules/plan/
git commit -m "feat: rewrite plan module for 4-level hierarchy with assignees

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Thai Fiscal Utils

**Files:**
- Modify: `packages/server/src/shared/thai.utils.ts`

- [ ] **Step 1: Add fiscal period helpers**

```typescript
export function getFiscalQuarterFromDate(date: Date): number {
  const month = date.getMonth() + 1;
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

export function getFiscalYearFromDate(date: Date): number {
  return toBE(date.getFullYear() + (date.getMonth() + 1 >= 10 ? 1 : 0));
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/shared/thai.utils.ts
git commit -m "feat: add fiscal quarter/week helpers to thai.utils

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Frontend Components

**Files:**
- Create: `packages/web/src/components/plan/strategy/StrategyList.vue`
- Create: `packages/web/src/components/plan/strategy/StrategyForm.vue`
- Create: `packages/web/src/components/plan/strategy/StrategyCard.vue`
- Create: `packages/web/src/components/plan/goal/GoalList.vue`
- Create: `packages/web/src/components/plan/goal/GoalForm.vue`
- Create: `packages/web/src/components/plan/goal/GoalCard.vue`
- Create: `packages/web/src/components/plan/IndicatorAssignees.vue`
- Modify: `packages/web/src/components/plan/IndicatorUpdateForm.vue` — use reportedDate
- Create: `packages/web/src/components/plan/IndicatorChart.vue`
- Create: `packages/web/src/components/plan/ProgressReport.vue`
- Modify: `packages/web/src/views/PlanDetailView.vue`

- [ ] **Step 1: Create StrategyList.vue**

Nested accordion: รายการ Strategy แต่ละอัน ขยายแสดง GoalList ข้างใน

- [ ] **Step 2: Create StrategyForm.vue**

Modal form: name, description (optional), sortOrder (auto or manual)

- [ ] **Step 3: Create GoalList.vue**

แสดงรายการ Goal ภายใต้ Strategy ที่เลือก ขยายแสดง IndicatorList

- [ ] **Step 4: Create GoalForm.vue**

Modal form: name, description

- [ ] **Step 5: Create IndicatorList.vue + IndicatorCard.vue**

แสดงตัวชี้วัด + assignees chips + inline update button

- [ ] **Step 6: Create IndicatorAssignees.vue**

NInputSelect multiple users, show as tags

- [ ] **Step 7: Modify IndicatorUpdateForm.vue**

ใช้ NDatePicker สำหรับ reportedDate แทน month/year fields

- [ ] **Step 8: Create IndicatorChart.vue**

ECharts line chart — x-axis: period, y-axis: reportedValue vs targetValue

- [ ] **Step 9: Create ProgressReport.vue**

Dropdown for period selection, then render IndicatorChart per indicator or aggregate

- [ ] **Step 10: Modify PlanDetailView.vue**

Replace old category-based UI with nested Strategy → Goal → Indicator accordion tree

- [ ] **Step 11: Commit**

```bash
git add packages/web/src/components/plan/ packages/web/src/views/PlanDetailView.vue
git commit -m "feat: add 4-level plan hierarchy UI components

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Migration & Seed

**Files:**
- Run: `bun run db:migrate` — apply new schema
- Modify: `packages/server/src/db/seed.ts` — add seed data for new tables

- [ ] **Step 1: Run migrate**

```bash
cd /Users/tongfreedom/projects/tp-one && bun run db:migrate
```

- [ ] **Step 2: Commit migration + seed**

```bash
git add packages/server/src/db/migrations/
git add packages/server/src/db/seed.ts
git commit -m "chore: add migration and seed for new plan schema

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [ ] All 4 levels (Plan → Strategy → Goal → Indicator) implemented
- [ ] Auto-codes: S{n}, S{n}-G{n}, S{n}-G{n}-K{nn}
- [ ] indicator_assignees junction for multiple assignees per indicator
- [ ] indicator_updates uses reportedDate (not month/year)
- [ ] Report aggregation: weekly, monthly, quarterly, yearly
- [ ] Thai fiscal logic: Q1=ต.ค.-ธ.ค.
- [ ] All API endpoints from spec implemented
- [ ] Frontend: nested accordion UI Strategy → Goal → Indicator
- [ ] ECharts line graph for progress visualization
- [ ] Migration generated and applied
- [ ] Seed updated for new schema

## Estimated Complexity: MEDIUM-HIGH

- Database schema + migration: 1-2 hours
- Backend service/controller: 3-4 hours
- Thai fiscal utils: 30 min
- Frontend components: 4-6 hours
- Testing: 2-3 hours
- **Total: 10-16 hours**

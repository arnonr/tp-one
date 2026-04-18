import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "completed",
]);

export const indicatorTypeEnum = pgEnum("indicator_type", [
  "amount",
  "count",
  "percentage",
]);

export const annualPlans = pgTable(
  "annual_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year").notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    status: planStatusEnum("status").default("draft").notNull(),
    createdById: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_annual_plans_year").on(table.year)]
);

export const planCategories = pgTable("plan_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .references(() => annualPlans.id)
    .notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const planIndicators = pgTable(
  "plan_indicators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .references(() => planCategories.id)
      .notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    targetValue: numeric("target_value", { precision: 15, scale: 2 })
      .notNull(),
    unit: varchar("unit", { length: 50 }),
    indicatorType: indicatorTypeEnum("indicator_type")
      .default("amount")
      .notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [
    index("idx_plan_indicators_category").on(table.categoryId),
    index("idx_plan_indicators_assignee").on(table.assigneeId),
  ]
);

export const indicatorUpdates = pgTable(
  "indicator_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indicatorId: uuid("indicator_id")
      .references(() => planIndicators.id)
      .notNull(),
    reportedValue: numeric("reported_value", {
      precision: 15,
      scale: 2,
    }).notNull(),
    reportedMonth: integer("reported_month").notNull(),
    reportedYear: integer("reported_year").notNull(),
    progressPct: numeric("progress_pct", { precision: 5, scale: 2 }),
    note: text("note"),
    evidenceUrl: varchar("evidence_url", { length: 500 }),
    reportedBy: uuid("reported_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_indicator_updates_indicator").on(table.indicatorId),
    index("idx_indicator_updates_period").on(
      table.indicatorId,
      table.reportedYear,
      table.reportedMonth
    ),
  ]
);

export const annualPlanRelations = relations(annualPlans, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [annualPlans.createdById],
    references: [users.id],
  }),
  categories: many(planCategories),
}));

export const planCategoryRelations = relations(
  planCategories,
  ({ one, many }) => ({
    plan: one(annualPlans, {
      fields: [planCategories.planId],
      references: [annualPlans.id],
    }),
    indicators: many(planIndicators),
  })
);

export const planIndicatorRelations = relations(
  planIndicators,
  ({ one, many }) => ({
    category: one(planCategories, {
      fields: [planIndicators.categoryId],
      references: [planCategories.id],
    }),
    assignee: one(users, {
      fields: [planIndicators.assigneeId],
      references: [users.id],
    }),
    updates: many(indicatorUpdates),
  })
);

export const indicatorUpdateRelations = relations(
  indicatorUpdates,
  ({ one }) => ({
    indicator: one(planIndicators, {
      fields: [indicatorUpdates.indicatorId],
      references: [planIndicators.id],
    }),
    reporter: one(users, {
      fields: [indicatorUpdates.reportedBy],
      references: [users.id],
    }),
  })
);

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
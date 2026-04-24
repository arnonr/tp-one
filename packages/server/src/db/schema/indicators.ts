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
}));

export const indicatorAssigneeRelations = relations(indicatorAssignees, ({ one }) => ({
  indicator: one(indicators, { fields: [indicatorAssignees.indicatorId], references: [indicators.id] }),
  user: one(users, { fields: [indicatorAssignees.userId], references: [users.id] }),
}));
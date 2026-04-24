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

export const goalRelations = relations(goals, ({ one }) => ({
  strategy: one(strategies, { fields: [goals.strategyId], references: [strategies.id] }),
}));
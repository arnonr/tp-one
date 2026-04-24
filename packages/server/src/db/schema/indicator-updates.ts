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
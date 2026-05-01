import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { planItemStatusEnum } from './plan-item-status';
import { users } from './users';

export const planStatusLogs = pgTable('plan_status_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 20 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  oldStatus: planItemStatusEnum('old_status'),
  newStatus: planItemStatusEnum('new_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  reason: text('reason'),
}, (table) => [
  index('idx_plan_status_logs_entity').on(table.entityType, table.entityId),
  index('idx_plan_status_logs_changed_at').on(table.changedAt),
]);

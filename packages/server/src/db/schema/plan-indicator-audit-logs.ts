import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { indicators, users } from './index';

export const planAuditActionEnum = pgEnum('plan_audit_action', [
  'created',
  'updated',
  'deleted',
  'reverted',
]);

export const planIndicatorAuditLogs = pgTable('plan_indicator_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicatorId: uuid('indicator_id').references(() => indicators.id).notNull(),
  changedBy: uuid('changed_by').references(() => users.id).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  action: planAuditActionEnum('action').notNull(),
  fieldName: varchar('field_name', { length: 50 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  reason: text('reason'),
}, (table) => [
  index('idx_plan_audit_indicator').on(table.indicatorId),
  index('idx_plan_audit_changed_at').on(table.changedAt),
]);

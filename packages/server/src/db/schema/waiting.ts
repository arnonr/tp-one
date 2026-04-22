import { pgTable, uuid, varchar, text, timestamp, date, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tasks } from './tasks';
import { users } from './users';

export const taskWaiting = pgTable('task_waiting', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id).notNull(),
  waitingFor: varchar('waiting_for', { length: 255 }).notNull(), // รอหน่วยงานอะไร
  contactPerson: varchar('contact_person', { length: 255 }),
  contactInfo: varchar('contact_info', { length: 500 }),
  expectedDate: date('expected_date'),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskFollowUps = pgTable('task_follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  waitingId: uuid('waiting_id').references(() => taskWaiting.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  note: text('note'),
  followUpDate: timestamp('follow_up_date', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskWaitingRelations = relations(taskWaiting, ({ one, many }) => ({
  task: one(tasks, { fields: [taskWaiting.taskId], references: [tasks.id] }),
  resolvedByUser: one(users, { fields: [taskWaiting.resolvedBy], references: [users.id] }),
  followUps: many(taskFollowUps),
}));

export const taskFollowUpsRelations = relations(taskFollowUps, ({ one }) => ({
  waiting: one(taskWaiting, { fields: [taskFollowUps.waitingId], references: [taskWaiting.id] }),
  user: one(users, { fields: [taskFollowUps.userId], references: [users.id] }),
}));

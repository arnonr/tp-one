import { pgTable, uuid, varchar, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskTemplateItems = pgTable('task_template_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => taskTemplates.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  sortOrder: integer('sort_order').default(0),
  assignToReporter: boolean('assign_to_reporter').default(false),
});

export const taskTemplateRelations = relations(taskTemplates, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [taskTemplates.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [taskTemplates.createdById], references: [users.id] }),
  items: many(taskTemplateItems),
}));

export const taskTemplateItemRelations = relations(taskTemplateItems, ({ one }) => ({
  template: one(taskTemplates, { fields: [taskTemplateItems.templateId], references: [taskTemplates.id] }),
}));

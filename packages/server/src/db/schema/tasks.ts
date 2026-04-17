import { pgTable, uuid, varchar, text, date, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { workspaces, workspaceStatuses } from "./workspaces";
import { projects } from "./projects";

export const priorityEnum = pgEnum("task_priority", ["urgent", "high", "normal", "low"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  parentId: uuid("parent_id"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  statusId: uuid("status_id").references(() => workspaceStatuses.id),
  priority: priorityEnum("priority").default("normal").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id),
  reporterId: uuid("reporter_id").references(() => users.id).notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskWatchers = pgTable("task_watchers", {
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
});

export const taskTags = pgTable("task_tags", {
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  tagId: uuid("tag_id").references(() => tags.id).notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: varchar("file_size", { length: 20 }),
  mimeType: varchar("mime_type", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  workspace: one(workspaces, { fields: [tasks.workspaceId], references: [workspaces.id] }),
  status: one(workspaceStatuses, { fields: [tasks.statusId], references: [workspaceStatuses.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  reporter: one(users, { fields: [tasks.reporterId], references: [users.id] }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  parentTask: one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: "subtasks" }),
  comments: many(comments),
  attachments: many(attachments),
}));

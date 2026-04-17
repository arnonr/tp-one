import { pgTable, uuid, varchar, text, date, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("planning").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectKpis = pgTable("project_kpis", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  targetValue: numeric("target_value").notNull(),
  currentValue: numeric("current_value").default("0"),
  unit: varchar("unit", { length: 50 }),
  period: pgEnum("kpi_period", ["monthly", "quarterly", "yearly"])("period").default("quarterly"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: pgEnum("project_member_role", ["owner", "member", "viewer"])("role").default("member"),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  kpis: many(projectKpis),
  members: many(projectMembers),
}));

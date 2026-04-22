import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const workspaceTypeEnum = pgEnum("workspace_type", [
  "rental",
  "consulting",
  "training",
  "incubation",
  "general",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: workspaceTypeEnum("type").default("general").notNull(),
  color: varchar("color", { length: 7 }),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceStatuses = pgTable("workspace_statuses", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  sortOrder: varchar("sort_order").default("0"),
  isDefault: boolean("is_default").default(false),
});

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "editor",
  "viewer",
]);

export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: workspaceMemberRoleEnum("role").default("viewer"),
}, (table) => [
  uniqueIndex("workspace_members_unique").on(table.workspaceId, table.userId),
]);

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  statuses: many(workspaceStatuses),
  members: many(workspaceMembers),
}));

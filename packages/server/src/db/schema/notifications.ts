import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userNotificationSettings = pgTable("user_notification_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  lineToken: varchar("line_token", { length: 500 }),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  notifyOnAssign: boolean("notify_on_assign").default(true).notNull(),
  notifyOnStatus: boolean("notify_on_status").default(true).notNull(),
  notifyOnComment: boolean("notify_on_comment").default(true).notNull(),
  notifyOnDueSoon: boolean("notify_on_due_soon").default(true).notNull(),
  dailyDigest: boolean("daily_digest").default(false),
});

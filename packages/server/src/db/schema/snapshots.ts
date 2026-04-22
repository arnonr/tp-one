import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "meeting",
  "activity",
  "workshop",
  "seminar",
  "training",
  "visit",
  "progress",
  "completion",
  "other",
]);

export const snapshots = pgTable("snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  evidenceType: evidenceTypeEnum("evidence_type").notNull(),
  takenDate: varchar("taken_date", { length: 10 }).notNull(),
  description: text("description"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  thumbnailPath: varchar("thumbnail_path", { length: 500 }),
  fileSize: varchar("file_size", { length: 20 }),
  mimeType: varchar("mime_type", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

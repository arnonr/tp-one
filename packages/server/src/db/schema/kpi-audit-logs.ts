import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { projectKpis, users } from "./index";

export const kpiAuditActionEnum = pgEnum("kpi_audit_action", [
  "created",
  "updated",
  "deleted",
  "reverted",
]);

export const kpiAuditLogs = pgTable("kpi_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kpiId: uuid("kpi_id").references(() => projectKpis.id).notNull(),
  changedBy: uuid("changed_by").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  action: kpiAuditActionEnum("action").notNull(),
  fieldName: varchar("field_name", { length: 50 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
});
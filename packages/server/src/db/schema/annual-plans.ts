import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { strategies } from "./strategies";

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "completed",
]);

export const annualPlans = pgTable(
  "annual_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year").notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: planStatusEnum("status").default("draft").notNull(),
    createdById: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_annual_plans_year").on(table.year)]
);

export const annualPlanRelations = relations(annualPlans, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [annualPlans.createdById],
    references: [users.id],
  }),
  strategies: many(strategies),
}));
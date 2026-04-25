CREATE TYPE "public"."plan_audit_action" AS ENUM('created', 'updated', 'deleted', 'reverted');--> statement-breakpoint
CREATE TABLE "plan_indicator_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" "plan_audit_action" NOT NULL,
	"field_name" varchar(50),
	"old_value" text,
	"new_value" text,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "plan_indicator_audit_logs" ADD CONSTRAINT "plan_indicator_audit_logs_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_indicator_audit_logs" ADD CONSTRAINT "plan_indicator_audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_audit_indicator" ON "plan_indicator_audit_logs" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plan_audit_changed_at" ON "plan_indicator_audit_logs" USING btree ("changed_at");

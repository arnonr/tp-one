CREATE TYPE "public"."kpi_audit_action" AS ENUM('created', 'updated', 'deleted', 'reverted');--> statement-breakpoint
CREATE TABLE "kpi_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" "kpi_audit_action" NOT NULL,
	"field_name" varchar(50),
	"old_value" text,
	"new_value" text,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_kpi_id_project_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."project_kpis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
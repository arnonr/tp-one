ALTER TABLE "tasks" ADD COLUMN "fiscal_year" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "budget" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_hours" numeric(8, 2);
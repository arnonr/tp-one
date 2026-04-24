ALTER TABLE "annual_plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plan_indicators" ADD COLUMN "weight" numeric(5, 2) DEFAULT '1';
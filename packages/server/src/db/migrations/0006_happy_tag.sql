CREATE TYPE "public"."evidence_type" AS ENUM('meeting', 'activity', 'workshop', 'seminar', 'training', 'visit', 'progress', 'completion', 'other');--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"evidence_type" "evidence_type" NOT NULL,
	"taken_date" varchar(10) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"thumbnail_path" varchar(500),
	"file_size" varchar(20),
	"mime_type" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE TYPE "public"."request_urgency" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
ALTER TYPE "public"."request_status" ADD VALUE IF NOT EXISTS 'InFulfillment';--> statement-breakpoint
ALTER TYPE "public"."change_status" ADD VALUE IF NOT EXISTS 'Submitted';--> statement-breakpoint
ALTER TYPE "public"."change_status" ADD VALUE IF NOT EXISTS 'Implemented';--> statement-breakpoint
ALTER TYPE "public"."change_status" ADD VALUE IF NOT EXISTS 'Closed';--> statement-breakpoint
ALTER TYPE "public"."change_status" ADD VALUE IF NOT EXISTS 'RolledBack';--> statement-breakpoint
CREATE TABLE "service_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"department" varchar(128) NOT NULL,
	"form_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "justification" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "urgency" "request_urgency" DEFAULT 'Medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN "scheduled_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN "scheduled_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
UPDATE "changes" SET "scheduled_start" = "scheduled_at" WHERE "scheduled_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "changes" DROP COLUMN IF EXISTS "scheduled_at";--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_catalog_id_service_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."service_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_catalog_department_idx" ON "service_catalog" USING btree ("department");--> statement-breakpoint
CREATE INDEX "service_requests_requester_id_idx" ON "service_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "changes_type_idx" ON "changes" USING btree ("type");

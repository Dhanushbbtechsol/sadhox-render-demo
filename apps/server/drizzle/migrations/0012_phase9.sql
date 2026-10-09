-- Phase 9 — org chart, escalation, notifications.href, assets assignment history
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reports_to_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_reports_to_id_users_id_fk" FOREIGN KEY ("reports_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_reports_to_id_idx" ON "users" USING btree ("reports_to_id");--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "sla_warned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "serial_number" varchar(128);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "location" varchar(128);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_owner_id" uuid,
	"to_owner_id" uuid,
	"assigned_by" uuid,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_from_owner_id_users_id_fk" FOREIGN KEY ("from_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_to_owner_id_users_id_fk" FOREIGN KEY ("to_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_asset_id_idx" ON "asset_assignments" USING btree ("asset_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalation_rules" (
	"priority" "priority_level" PRIMARY KEY NOT NULL,
	"notify_manager" boolean DEFAULT true NOT NULL,
	"notify_admin" boolean DEFAULT false NOT NULL
);--> statement-breakpoint
INSERT INTO "escalation_rules" ("priority", "notify_manager", "notify_admin")
VALUES
	('P1', true, true),
	('P2', true, true),
	('P3', true, false),
	('P4', true, false)
ON CONFLICT ("priority") DO NOTHING;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "href" varchar(512);

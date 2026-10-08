-- Phase 7 — incident + catalog subcategory columns (no category value rewrite).
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "subcategory" varchar(128) DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_catalog" ADD COLUMN IF NOT EXISTS "subcategory" varchar(128);

-- Phase 7 — incident subcategory (category map validated in Nest DTO).
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "subcategory" varchar(128) DEFAULT 'Other' NOT NULL;

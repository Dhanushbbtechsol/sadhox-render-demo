ALTER TABLE "incidents" ADD COLUMN "sla_breached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "resolution_notes" text;

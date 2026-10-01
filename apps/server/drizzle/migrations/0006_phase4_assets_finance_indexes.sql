ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "purchase_cost" numeric(12, 2);-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets" USING btree ("status");-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_linked_ticket_id_idx" ON "assets" USING btree ("linked_ticket_id");

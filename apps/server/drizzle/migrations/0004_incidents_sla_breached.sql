-- Phase 3 Day 12: SLA breach flag (incidents only — only table with sla_due_at).
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "sla_breached" boolean DEFAULT false NOT NULL;
CREATE INDEX IF NOT EXISTS "incidents_sla_breach_idx"
  ON "incidents" ("sla_breached", "sla_due_at")
  WHERE "sla_breached" = false;

-- purchase_cost is required by AssetsService / CreateAssetDto (Admin financial field).
-- Restores column if previously dropped out-of-band on a shared DB.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "purchase_cost" numeric(12, 2);

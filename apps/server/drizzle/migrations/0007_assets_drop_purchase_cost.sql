-- Drop unmanaged remote-only column (never in TypeScript schema / app code).
-- Decision 2026-09-30: remove rather than adopt.
ALTER TABLE "assets" DROP COLUMN IF EXISTS "purchase_cost";

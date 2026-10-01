-- assets.asset_tag was added to the TypeScript schema without a migration.
-- Empty-table-safe: NOT NULL + UNIQUE on a new column.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "asset_tag" varchar(64);--> statement-breakpoint
UPDATE "assets" SET "asset_tag" = 'ASSET-' || substr(replace(id::text, '-', ''), 1, 12) WHERE "asset_tag" IS NULL;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "asset_tag" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assets_asset_tag_unique" ON "assets" ("asset_tag");

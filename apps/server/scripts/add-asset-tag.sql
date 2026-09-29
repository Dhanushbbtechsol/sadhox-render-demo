-- Dev C Phase 2: add asset_tag without destructive drizzle push.
-- Run against the Sadhox Postgres when the host is reachable.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_tag varchar(64);

UPDATE assets
SET asset_tag = 'AST-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE asset_tag IS NULL OR asset_tag = '';

ALTER TABLE assets ALTER COLUMN asset_tag SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE assets ADD CONSTRAINT assets_asset_tag_unique UNIQUE (asset_tag);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

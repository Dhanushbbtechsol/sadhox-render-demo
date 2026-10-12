CREATE TABLE IF NOT EXISTS "reference_counters" (
  "prefix" varchar(8) PRIMARY KEY NOT NULL,
  "value" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM incidents
  WHERE reference_code IS NULL
)
UPDATE incidents AS i
SET reference_code = 'INC-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE i.id = numbered.id;--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM problems
  WHERE reference_code IS NULL
)
UPDATE problems AS p
SET reference_code = 'ISS-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE p.id = numbered.id;--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM service_requests
  WHERE reference_code IS NULL
)
UPDATE service_requests AS r
SET reference_code = 'REQ-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE r.id = numbered.id;--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM changes
  WHERE reference_code IS NULL
)
UPDATE changes AS c
SET reference_code = 'CHG-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE c.id = numbered.id;--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM assets
  WHERE reference_code IS NULL
)
UPDATE assets AS a
SET reference_code = 'AST-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE a.id = numbered.id;--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'INC', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM incidents
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'ISS', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM problems
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'REQ', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM service_requests
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'CHG', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM changes
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'AST', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM assets
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
ALTER TABLE "incidents" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "changes" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "incidents_reference_code_unique" ON "incidents" ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "problems_reference_code_unique" ON "problems" ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_requests_reference_code_unique" ON "service_requests" ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "changes_reference_code_unique" ON "changes" ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assets_reference_code_unique" ON "assets" ("reference_code");

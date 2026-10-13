ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "reference_code" varchar(16);--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM users
  WHERE reference_code IS NULL
)
UPDATE users AS u
SET reference_code = 'USR-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE u.id = numbered.id;--> statement-breakpoint
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM projects
  WHERE reference_code IS NULL
)
UPDATE projects AS p
SET reference_code = 'PRJ-' || lpad(numbered.n::text, 6, '0')
FROM numbered
WHERE p.id = numbered.id;--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'USR', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM users
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
INSERT INTO reference_counters (prefix, value)
SELECT 'PRJ', COALESCE(MAX(split_part(reference_code, '-', 2)::int), 0) FROM projects
ON CONFLICT (prefix) DO UPDATE SET value = GREATEST(reference_counters.value, EXCLUDED.value);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "reference_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_reference_code_unique" ON "users" ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_reference_code_unique" ON "projects" ("reference_code");

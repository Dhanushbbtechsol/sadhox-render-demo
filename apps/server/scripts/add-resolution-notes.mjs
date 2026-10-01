import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });

const before = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public' and table_name = 'incidents'
    and column_name = 'resolution_notes'
`;
console.log("BEFORE_resolution_notes", before.length > 0 ? "present" : "MISSING");

if (before.length === 0) {
  await sql`ALTER TABLE "incidents" ADD COLUMN "resolution_notes" text`;
  console.log("APPLIED: ADD COLUMN resolution_notes text");
} else {
  console.log("SKIP: already present");
}

const after = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public' and table_name = 'incidents'
    and column_name = 'resolution_notes'
`;
console.log("AFTER_resolution_notes", after.length > 0 ? "present" : "MISSING");

const rows = await sql`
  select id, title, resolution_notes, sla_breached
  from incidents
  order by created_at desc
  limit 2
`;
console.log("SELECT_OK", rows.length, rows.map((r) => r.id).join(","));

await sql.end({ timeout: 2 });

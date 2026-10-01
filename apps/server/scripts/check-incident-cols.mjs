import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });
const cols = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public' and table_name = 'incidents'
  order by ordinal_position
`;
console.log("COLS", cols.map((c) => c.column_name).join(","));
const needed = ["sla_breached", "resolution_notes", "resolved_at", "closed_at"];
for (const n of needed) {
  console.log(
    n,
    cols.some((c) => c.column_name === n) ? "present" : "MISSING",
  );
}
try {
  const rows = await sql`
    select id, title, sla_breached, resolution_notes
    from incidents
    order by created_at desc
    limit 2
  `;
  console.log("SELECT_OK", rows.length, rows[0]?.id);
} catch (e) {
  console.error("SELECT_FAIL", e instanceof Error ? e.message : e);
}
await sql.end({ timeout: 2 });

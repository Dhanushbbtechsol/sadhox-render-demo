import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });
const cols = await sql`
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'assets'
  order by ordinal_position
`;
console.log(JSON.stringify(cols, null, 2));
const idx = await sql`
  select indexname, indexdef from pg_indexes
  where schemaname = 'public' and tablename = 'assets'
`;
console.log("indexes", idx);
const nidx = await sql`
  select indexname from pg_indexes
  where schemaname = 'public' and indexname = 'notifications_user_id_idx'
`;
console.log("notifications_user_id_idx", nidx.length ? "present" : "MISSING");
await sql.end({ timeout: 2 });

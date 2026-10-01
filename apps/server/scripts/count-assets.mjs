import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });
const [{ n }] = await sql`select count(*)::int as n from assets`;
console.log("assets_count", n);
const rows = await sql`select id, name, type::text from assets order by created_at limit 10`;
console.log(rows);
await sql.end({ timeout: 2 });

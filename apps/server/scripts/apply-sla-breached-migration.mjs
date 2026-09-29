import { readFileSync } from "fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const ddl = readFileSync(
  new URL("../drizzle/migrations/0003_incidents_sla_breached.sql", import.meta.url),
  "utf8",
);
await sql.unsafe(ddl);
console.log("MIGRATION_APPLIED ok");

const cols = await sql`
  select column_name, data_type, column_default, is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'incidents'
    and column_name = 'sla_breached'
`;
console.log("COLUMN", JSON.stringify(cols));

const rules = await sql`
  select priority, response_minutes, resolve_minutes
  from sla_rules
  order by priority
`;
console.log("SLA_RULES_COUNT", rules.length);
console.log(JSON.stringify(rules, null, 2));

await sql.end();

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const rules = await sql`
  select priority, response_minutes, resolve_minutes
  from sla_rules
  order by priority
`;
console.log("SLA_RULES_COUNT", rules.length);
console.log(JSON.stringify(rules, null, 2));
const cols = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'incidents'
    and column_name like 'sla%'
  order by column_name
`;
console.log(
  "INCIDENT_SLA_COLS",
  cols.map((c) => c.column_name).join(","),
);
await sql.end();

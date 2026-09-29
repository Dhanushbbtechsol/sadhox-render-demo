import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const cols = await sql`
  select column_name, is_nullable, data_type, column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'audit_log'
    and column_name = 'actor_id'
`;
console.log(JSON.stringify(cols, null, 2));
await sql.end();

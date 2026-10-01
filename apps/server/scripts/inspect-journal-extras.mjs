import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, "../drizzle/migrations");
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });

const rows = await sql`
  select id, hash, created_at
  from drizzle.__drizzle_migrations
  order by created_at::bigint
`;

const byHash = new Map();
for (const f of readdirSync(migDir).filter((x) => x.endsWith(".sql"))) {
  const body = readFileSync(join(migDir, f), "utf8");
  byHash.set(createHash("sha256").update(body).digest("hex"), f);
}

console.log("=== JOURNAL ===");
for (const r of rows) {
  console.log(
    `id=${r.id} when=${r.created_at} file=${byHash.get(r.hash) ?? "UNKNOWN"} hash=${r.hash}`,
  );
}

const expectedTables = {
  users: ["id","email","password_hash","role","name","created_at","updated_at"],
  assets: ["id","asset_tag","name","type","owner_id","status","linked_ticket_id","created_at","updated_at"],
  incidents: ["id","title","description","category","priority","impact","urgency","status","assigned_to","reporter_id","sla_due_at","sla_breached","resolution_notes","resolved_at","closed_at","created_at","updated_at"],
  service_requests: ["id","catalog_id","requester_id","approver_id","title","description","justification","urgency","fields","status","assignee_id","approved_at","rejection_reason","fulfillment_notes","fulfilled_at","created_at","updated_at"],
};

const cols = await sql`
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = any(${Object.keys(expectedTables)})
`;
const byTable = new Map();
for (const c of cols) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Set());
  byTable.get(c.table_name).add(c.column_name);
}
console.log("\n=== EXTRA/MISSING sample tables ===");
for (const [t, expected] of Object.entries(expectedTables)) {
  const remote = byTable.get(t) ?? new Set();
  const miss = expected.filter((c) => !remote.has(c));
  const extra = [...remote].filter((c) => !expected.includes(c));
  console.log(t, { miss, extra });
}

await sql.end({ timeout: 2 });

import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, "../drizzle/migrations");
const EXPECTED = [
  "0000_same_tag",
  "0001_incidents_problems_phase2",
  "0002_phase2_catalog_approvals",
  "0003_phase3_incident_workflow",
  "0004_incidents_sla_breached",
  "0005_phase3_request_fulfillment",
  "0006_phase4_assets_finance_indexes",
  "0007_assets_asset_tag",
];

function fileHash(tag) {
  return createHash("sha256")
    .update(readFileSync(join(migDir, `${tag}.sql`), "utf8"))
    .digest("hex");
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });

const col = await sql`
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'assets'
    and column_name = 'purchase_cost'
`;
console.log(
  "purchase_cost",
  col.length ? "PRESENT" : "ABSENT",
);
// Audit merge: purchase_cost is owned by Dev-C Phase 4 (must be present).

const rows = await sql`
  select id, hash, created_at
  from drizzle.__drizzle_migrations
  order by created_at::bigint
`;
const byHash = new Map(EXPECTED.map((t) => [fileHash(t), t]));
console.log("journal_rows", rows.length);
let allMatch = rows.length === EXPECTED.length;
for (const r of rows) {
  const tag = byHash.get(r.hash) ?? "UNKNOWN";
  if (tag === "UNKNOWN") allMatch = false;
  console.log(`  ${tag} hash=${r.hash.slice(0, 12)}… when=${r.created_at}`);
}
for (const t of EXPECTED) {
  const h = fileHash(t);
  const found = rows.some((r) => r.hash === h);
  if (!found) {
    allMatch = false;
    console.log(`MISSING_IN_REMOTE_JOURNAL: ${t}`);
  }
}
console.log("JOURNAL_MATCH_LOCAL_0000_0007", allMatch ? "YES" : "NO");

await sql.end({ timeout: 2 });
process.exit(allMatch && col.length > 0 ? 0 : 2);

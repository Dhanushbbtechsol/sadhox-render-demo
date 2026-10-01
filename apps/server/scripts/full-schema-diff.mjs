/**
 * Full schema parity: remote Postgres vs Drizzle TypeScript schema expectations.
 * Also reports applied __drizzle_migrations vs local journal tags.
 */
import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, "../drizzle/migrations");

/** Expected columns from src/database/schema/index.ts (authoritative app schema). */
const EXPECTED = {
  users: [
    "id",
    "email",
    "password_hash",
    "role",
    "name",
    "created_at",
    "updated_at",
  ],
  refresh_tokens: [
    "id",
    "user_id",
    "token_hash",
    "expires_at",
    "revoked",
    "created_at",
  ],
  audit_log: [
    "id",
    "actor_id",
    "action",
    "entity_type",
    "entity_id",
    "diff",
    "created_at",
  ],
  incidents: [
    "id",
    "title",
    "description",
    "category",
    "priority",
    "impact",
    "urgency",
    "status",
    "assigned_to",
    "reporter_id",
    "sla_due_at",
    "sla_breached",
    "resolution_notes",
    "resolved_at",
    "closed_at",
    "created_at",
    "updated_at",
  ],
  problems: [
    "id",
    "title",
    "description",
    "root_cause",
    "known_error",
    "status",
    "assigned_to",
    "created_at",
    "updated_at",
  ],
  problem_incidents: ["problem_id", "incident_id", "created_at"],
  service_catalog: [
    "id",
    "name",
    "description",
    "department",
    "form_fields",
    "is_active",
    "created_at",
    "updated_at",
  ],
  service_requests: [
    "id",
    "catalog_id",
    "requester_id",
    "approver_id",
    "title",
    "description",
    "justification",
    "urgency",
    "fields",
    "status",
    "assignee_id",
    "approved_at",
    "rejection_reason",
    "fulfillment_notes",
    "fulfilled_at",
    "created_at",
    "updated_at",
  ],
  changes: [
    "id",
    "title",
    "description",
    "type",
    "scheduled_start",
    "scheduled_end",
    "rollback_plan",
    "status",
    "created_by",
    "approved_by",
    "approved_at",
    "created_at",
    "updated_at",
  ],
  assets: [
    "id",
    "asset_tag",
    "name",
    "type",
    "owner_id",
    "status",
    "purchase_cost",
    "linked_ticket_id",
    "created_at",
    "updated_at",
  ],
  comments: [
    "id",
    "ticket_id",
    "ticket_type",
    "author_id",
    "content",
    "deleted_at",
    "created_at",
  ],
  sla_rules: [
    "id",
    "priority",
    "response_minutes",
    "resolve_minutes",
    "created_at",
  ],
  notifications: [
    "id",
    "user_id",
    "type",
    "title",
    "body",
    "read_at",
    "created_at",
  ],
};

const EXPECTED_INDEXES = [
  "users_email_idx",
  "refresh_tokens_user_id_idx",
  "refresh_tokens_token_hash_idx",
  "audit_log_entity_idx",
  "incidents_status_idx",
  "incidents_assigned_to_idx",
  "incidents_reporter_id_idx",
  "incidents_sla_breach_idx",
  "problems_status_idx",
  "problem_incidents_problem_id_idx",
  "service_catalog_department_idx",
  "service_requests_status_idx",
  "service_requests_requester_id_idx",
  "changes_status_idx",
  "changes_type_idx",
  "assets_owner_id_idx",
  "assets_asset_tag_unique",
  "comments_ticket_idx",
  "notifications_user_id_idx",
];

const JOURNAL_TAGS = [
  "0000_same_tag",
  "0001_incidents_problems_phase2",
  "0002_phase2_catalog_approvals",
  "0003_phase3_incident_workflow",
  "0004_incidents_sla_breached",
  "0005_phase3_request_fulfillment",
  "0006_phase4_assets_finance_indexes",
  "0007_assets_asset_tag",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 10 });

const cols = await sql`
  select table_name, column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = any(${Object.keys(EXPECTED)})
  order by table_name, ordinal_position
`;

const byTable = new Map();
for (const c of cols) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
  byTable.get(c.table_name).push(c.column_name);
}

const allPublicTables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`;

console.log("=== REMOTE PUBLIC TABLES ===");
console.log(allPublicTables.map((t) => t.table_name).join(", "));

let missingCols = 0;
let extraCols = 0;
console.log("\n=== COLUMN DIFF (expected schema vs remote) ===");
for (const [table, expected] of Object.entries(EXPECTED)) {
  const remote = byTable.get(table) ?? [];
  const miss = expected.filter((c) => !remote.includes(c));
  const extra = remote.filter((c) => !expected.includes(c));
  if (miss.length || extra.length) {
    console.log(`TABLE ${table}`);
    if (miss.length) {
      console.log(`  MISSING: ${miss.join(", ")}`);
      missingCols += miss.length;
    }
    if (extra.length) {
      console.log(`  EXTRA:   ${extra.join(", ")}`);
      extraCols += extra.length;
    }
  } else {
    console.log(`TABLE ${table}: OK (${expected.length} cols)`);
  }
}

const indexes = await sql`
  select indexname from pg_indexes
  where schemaname = 'public'
  order by indexname
`;
const remoteIdx = new Set(indexes.map((i) => i.indexname));
console.log("\n=== INDEX DIFF (expected named indexes) ===");
let missingIdx = 0;
for (const name of EXPECTED_INDEXES) {
  if (!remoteIdx.has(name)) {
    console.log(`MISSING_INDEX: ${name}`);
    missingIdx++;
  } else {
    console.log(`INDEX_OK: ${name}`);
  }
}

const fks = await sql`
  select
    tc.table_name,
    kcu.column_name,
    ccu.table_name as foreign_table,
    tc.constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name in ('service_requests', 'incidents', 'assets')
  order by tc.table_name, kcu.column_name
`;
console.log("\n=== KEY FKs (service_requests / incidents / assets) ===");
for (const fk of fks) {
  console.log(
    `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table} (${fk.constraint_name})`,
  );
}
const hasAssigneeFk = fks.some(
  (f) =>
    f.table_name === "service_requests" &&
    f.column_name === "assignee_id" &&
    f.foreign_table === "users",
);
console.log(
  hasAssigneeFk
    ? "FK_OK: service_requests.assignee_id -> users"
    : "MISSING_FK: service_requests.assignee_id -> users",
);

const migRows = await sql`
  select id, hash, created_at
  from drizzle.__drizzle_migrations
  order by created_at
`;
console.log("\n=== REMOTE __drizzle_migrations ===");
for (const r of migRows) {
  console.log(`  hash=${r.hash} created_at=${r.created_at}`);
}

console.log("\n=== LOCAL JOURNAL TAGS + FILE HASHES ===");
const appliedHashes = new Set(migRows.map((r) => r.hash));
for (const tag of JOURNAL_TAGS) {
  const file = join(migDir, `${tag}.sql`);
  const body = readFileSync(file, "utf8");
  const hash = createHash("sha256").update(body).digest("hex");
  const applied = appliedHashes.has(hash);
  console.log(
    `${tag}: ${applied ? "APPLIED_HASH_MATCH" : "NOT_IN_REMOTE_JOURNAL"} hash=${hash.slice(0, 12)}…`,
  );
}

console.log("\n=== SUMMARY ===");
console.log(
  JSON.stringify(
    {
      missingCols,
      extraCols,
      missingIdx,
      assigneeFk: hasAssigneeFk,
      remoteMigrationRows: migRows.length,
      expectedJournalTags: JOURNAL_TAGS.length,
    },
    null,
    2,
  ),
);

await sql.end({ timeout: 2 });
process.exit(missingCols > 0 || missingIdx > 0 || !hasAssigneeFk ? 2 : 0);

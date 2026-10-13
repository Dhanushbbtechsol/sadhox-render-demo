/**
 * Reconcile remote schema + drizzle.__drizzle_migrations with local journal.
 *
 * - 0003 already contains resolution_notes (manual ALTER matched that statement).
 * - 0005 objects already present; journal row was missing.
 * - 0006 adds purchase_cost + asset indexes (Dev-C).
 * - 0007 adds assets.asset_tag (was Dev-D 0006; renumbered on Audit merge).
 */
import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, "../drizzle/migrations");

const ENTRIES = [
  { tag: "0000_same_tag", when: 1790325966531 },
  { tag: "0001_incidents_problems_phase2", when: 1790328000000 },
  { tag: "0002_phase2_catalog_approvals", when: 1790580000000 },
  { tag: "0003_phase3_incident_workflow", when: 1790666400000 },
  { tag: "0004_incidents_sla_breached", when: 1790680000000 },
  { tag: "0005_phase3_request_fulfillment", when: 1790900000000 },
  { tag: "0006_phase4_assets_finance_indexes", when: 1791000000000 },
  { tag: "0007_assets_asset_tag", when: 1791050000000 },
];

function fileHash(tag) {
  if (!/^[0-9]{4}_[A-Za-z0-9_]+$/.test(tag)) {
    throw new Error(`Unexpected migration tag: ${tag}`);
  }
  const body = readFileSync(`${migDir}/${tag}.sql`, "utf8");
  return createHash("sha256").update(body).digest("hex");
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });

console.log("=== APPLY remaining SQL (idempotent where possible) ===");

// 0003 second statement (first already covered by 0004 IF NOT EXISTS)
await sql.unsafe(
  `ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "resolution_notes" text`,
);
console.log("OK resolution_notes IF NOT EXISTS");

// 0006 finance indexes + purchase_cost
const mig6 = readFileSync(
  join(migDir, "0006_phase4_assets_finance_indexes.sql"),
  "utf8",
);
for (const stmt of mig6.split("-->statement-breakpoint")) {
  const s = stmt.trim();
  if (s) {
    await sql.unsafe(s);
    console.log("OK 0006 stmt:", s.slice(0, 72).replace(/\s+/g, " "));
  }
}

// 0007 asset_tag
const mig7 = readFileSync(join(migDir, "0007_assets_asset_tag.sql"), "utf8");
for (const stmt of mig7.split("--> statement-breakpoint")) {
  const s = stmt.trim();
  if (s) {
    await sql.unsafe(s);
    console.log("OK 0007 stmt:", s.slice(0, 72).replace(/\s+/g, " "));
  }
}

console.log("\n=== SYNC journal hashes ===");
const existing = await sql`
  select hash from drizzle.__drizzle_migrations
`;
const have = new Set(existing.map((r) => r.hash));

for (const e of ENTRIES) {
  const hash = fileHash(e.tag);
  if (have.has(hash)) {
    console.log(`ALREADY ${e.tag}`);
    continue;
  }
  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${hash}, ${String(e.when)})
  `;
  console.log(`INSERTED ${e.tag} hash=${hash.slice(0, 12)}… when=${e.when}`);
}

const after = await sql`
  select id, hash, created_at
  from drizzle.__drizzle_migrations
  order by created_at::bigint
`;
console.log("\n=== JOURNAL AFTER ===");
for (const r of after) {
  const match = ENTRIES.find((e) => fileHash(e.tag) === r.hash);
  console.log(
    `  id=${r.id} when=${r.created_at} tag=${match?.tag ?? "UNKNOWN"} hash=${r.hash.slice(0, 12)}…`,
  );
}

await sql.end({ timeout: 2 });

/**
 * Show or rebaseline drizzle.__drizzle_migrations on a target Postgres.
 * Destructive in `rebaseline` mode — local/lab ops only, never CI/deploy.
 *
 * Requires DATABASE_URL (or REMOTE_DATABASE_URL alias). No host fallbacks.
 *
 * Example:
 *   DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox \
 *     node scripts/rebaseline-remote-journal.mjs show
 *
 * Or with apps/server/.env loaded:
 *   node scripts/rebaseline-remote-journal.mjs show
 */
import postgres from "postgres";
import { requireEnv } from "./require-env.mjs";

// dotenv loaded by require-env. Prefer REMOTE_DATABASE_URL, else DATABASE_URL.
const REMOTE =
  process.env.REMOTE_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";
if (!REMOTE) {
  requireEnv(["DATABASE_URL"]);
}

/** Exact match of local's four applied rows (hash + created_at). */
const LOCAL_ROWS = [
  {
    id: 1,
    hash: "14f999042343590b00e336d4519a1d50b8d441c45b09d569d6cf0a993c13fba4",
    created_at: "1790325966531",
  },
  {
    id: 2,
    hash: "ed0ad5f774b5a4680edf5b5096a7bb652334765f11ca5ef102f0992a177ff8f7",
    created_at: "1790328000000",
  },
  {
    id: 3,
    hash: "256fe11ac45dbe241390c242924b772763c9d061dd5e7bd4328c098c54a1404d",
    created_at: "1790580000000",
  },
  {
    id: 4,
    hash: "831dc766f5956a8505fb411abb54b7060e3bb995db3b2190d5dc648d6b0bc106",
    created_at: "1790680000000",
  },
];

const mode = process.argv[2] ?? "show";
const sql = postgres(REMOTE, { max: 1, connect_timeout: 10 });

async function show(label) {
  const rows = await sql`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by id
  `;
  console.log(label);
  for (const r of rows) {
    console.log(
      `  id=${r.id} created_at=${r.created_at} hash=${r.hash}`,
    );
  }
  return rows;
}

try {
  if (mode === "show") {
    await show("REMOTE_JOURNAL");
  } else if (mode === "rebaseline") {
    await show("REMOTE_JOURNAL_BEFORE");
    await sql.begin(async (tx) => {
      await tx`delete from drizzle.__drizzle_migrations`;
      for (const row of LOCAL_ROWS) {
        await tx`
          insert into drizzle.__drizzle_migrations (id, hash, created_at)
          values (${row.id}, ${row.hash}, ${row.created_at})
        `;
      }
    });
    await show("REMOTE_JOURNAL_AFTER");
    console.log("REBASELINE_OK");
  } else {
    console.error("Usage: node rebaseline-remote-journal.mjs [show|rebaseline]");
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 2 });
}

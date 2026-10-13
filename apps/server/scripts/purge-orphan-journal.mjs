/**
 * Remove orphan drizzle.__drizzle_migrations rows whose hash is not any
 * local migration file. Keeps remote journal aligned with repo tags 0000–0006.
 */
import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, "../drizzle/migrations");

function migrationSqlPath(fileName) {
  if (!/^[0-9]{4}_[A-Za-z0-9_]+\.sql$/.test(fileName)) {
    throw new Error(`Unexpected migration file name: ${fileName}`);
  }
  return `${migDir}/${fileName}`;
}

const known = new Set(
  readdirSync(migDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) =>
      createHash("sha256")
        .update(readFileSync(migrationSqlPath(f), "utf8"))
        .digest("hex"),
    ),
);

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
const rows = await sql`
  select id, hash, created_at from drizzle.__drizzle_migrations
  order by created_at::bigint
`;

console.log("BEFORE");
for (const r of rows) {
  console.log(
    `  id=${r.id} known=${known.has(r.hash)} hash=${r.hash.slice(0, 12)}…`,
  );
}

const orphans = rows.filter((r) => !known.has(r.hash));
for (const o of orphans) {
  await sql`delete from drizzle.__drizzle_migrations where id = ${o.id}`;
  console.log(`DELETED orphan id=${o.id} hash=${o.hash}`);
}

const after = await sql`
  select id, hash, created_at from drizzle.__drizzle_migrations
  order by created_at::bigint
`;
console.log("AFTER count=", after.length);
for (const r of after) {
  console.log(`  id=${r.id} hash=${r.hash.slice(0, 12)}… when=${r.created_at}`);
}

await sql.end({ timeout: 2 });
if (after.length !== known.size) {
  console.error(
    `WARN: journal rows (${after.length}) != local sql files (${known.size})`,
  );
  process.exit(2);
}

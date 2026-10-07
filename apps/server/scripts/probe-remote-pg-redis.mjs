/**
 * Minimal Postgres + Redis ping (local ops).
 * Requires DATABASE_URL and REDIS_URL — no host fallbacks.
 *
 * Example:
 *   DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox \
 *   REDIS_URL=redis://127.0.0.1:16379 \
 *   node scripts/probe-remote-pg-redis.mjs
 */
import postgres from "postgres";
import { Redis } from "ioredis";
import { requireEnv } from "./require-env.mjs";

const { DATABASE_URL, REDIS_URL } = requireEnv(["DATABASE_URL", "REDIS_URL"]);

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 8 });
const rows = await sql`select count(*)::int as n from incidents`;
console.log("PG_OK incidents=" + rows[0].n);
await sql.end({ timeout: 2 });

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});
await redis.connect();
console.log("REDIS_OK ping=" + (await redis.ping()));
await redis.quit();

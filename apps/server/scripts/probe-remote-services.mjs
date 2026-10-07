/**
 * Probe Postgres + Redis connectivity for local / shared-lab ops.
 *
 * Requires DATABASE_URL and REDIS_URL (no hardcoded host fallbacks).
 * Values may come from the environment or apps/server/.env via dotenv.
 *
 * Example (local docker-compose publish ports):
 *   DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox \
 *   REDIS_URL=redis://127.0.0.1:16379 \
 *   node scripts/probe-remote-services.mjs
 *
 * Or from apps/server with `.env` already set:
 *   node scripts/probe-remote-services.mjs
 */
import postgres from "postgres";
import Redis from "ioredis";
import { requireEnv } from "./require-env.mjs";

const { DATABASE_URL: dbUrl, REDIS_URL: redisUrl } = requireEnv([
  "DATABASE_URL",
  "REDIS_URL",
]);

const sql = postgres(dbUrl, { max: 1, connect_timeout: 8 });
try {
  const rows = await sql`
    select current_database() as db, inet_server_addr()::text as addr,
           (select count(*)::int from users) as users,
           (select count(*)::int from incidents) as incidents
  `;
  console.log("REMOTE_PG_OK", rows[0]);
} catch (e) {
  console.error("REMOTE_PG_FAIL", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});
try {
  await redis.connect();
  console.log("REMOTE_REDIS_OK", await redis.ping());
} catch (e) {
  console.error("REMOTE_REDIS_FAIL", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  redis.disconnect();
}

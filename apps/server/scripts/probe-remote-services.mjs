import postgres from "postgres";
import Redis from "ioredis";

const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://sadhox:sadhox@192.168.68.111:5437/sadhox";
const redisUrl = process.env.REDIS_URL ?? "redis://192.168.68.111:16379";

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

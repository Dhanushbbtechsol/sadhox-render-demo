import "dotenv/config";
import postgres from "postgres";
import { Redis } from "ioredis";

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });
const rows = await sql`select count(*)::int as n from incidents`;
console.log("PG_OK incidents=" + rows[0].n);
await sql.end({ timeout: 2 });

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  lazyConnect: true,
});
await redis.connect();
console.log("REDIS_OK ping=" + (await redis.ping()));
await redis.quit();

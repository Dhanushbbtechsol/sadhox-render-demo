import type { ThrottlerStorage } from "@nestjs/throttler";
import type { Sql } from "postgres";

/** ponytail: Postgres counter (already on DATABASE_URL). Ceiling: no extra blockDuration window. Upgrade: ioredis storage if cache is split from the DB. */
export class PostgresThrottlerStorage implements ThrottlerStorage {
  private ready: Promise<void> | null = null;

  constructor(private readonly sql: Sql) {}

  private ensureTable(): Promise<void> {
    if (!this.ready) {
      this.ready = this.sql
        .unsafe(
          `CREATE TABLE IF NOT EXISTS throttle_hits (
            k text PRIMARY KEY,
            hits integer NOT NULL,
            expires_at timestamptz NOT NULL
          )`,
        )
        .then(() => undefined);
    }
    return this.ready;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    await this.ensureTable();
    const k = `${throttlerName}:${key}`;
    const rows = await this.sql<Array<{ hits: number; expires_at: Date }>>`
      INSERT INTO throttle_hits (k, hits, expires_at)
      VALUES (${k}, 1, now() + (${ttl}::int * interval '1 millisecond'))
      ON CONFLICT (k) DO UPDATE SET
        hits = CASE
          WHEN throttle_hits.expires_at <= now() THEN 1
          ELSE throttle_hits.hits + 1
        END,
        expires_at = CASE
          WHEN throttle_hits.expires_at <= now() THEN now() + (${ttl}::int * interval '1 millisecond')
          ELSE throttle_hits.expires_at
        END
      RETURNING hits, expires_at
    `;
    const row = rows[0];
    if (!row) {
      throw new Error("throttle increment returned no row");
    }
    const hits = row.hits;
    const timeToExpire = Math.max(
      0,
      Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000),
    );
    const isBlocked = hits > limit;
    const timeToBlockExpire = isBlocked
      ? Math.max(timeToExpire, Math.ceil(blockDuration / 1000))
      : 0;
    return {
      totalHits: hits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}

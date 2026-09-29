import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import Redis from "ioredis";
import { Public } from "../common/decorators/public.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { SLA_QUEUE } from "../queues/queue.constants";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Liveness, database, and Redis/queue connectivity check",
  })
  async check() {
    await this.db.execute(sql`select 1`);

    const url = this.config.getOrThrow<string>("REDIS_URL");
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    let redis: "up" | "down";
    try {
      await client.connect();
      const pong = await client.ping();
      redis = pong === "PONG" ? "up" : "down";
    } catch {
      redis = "down";
    } finally {
      client.disconnect();
    }

    return {
      status: redis === "up" ? "ok" : "degraded",
      database: "up",
      redis,
      queues: {
        [SLA_QUEUE]: redis,
      },
    };
  }
}

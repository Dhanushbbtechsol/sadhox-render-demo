import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import Redis from "ioredis";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
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
  @ApiOperation({ summary: "Liveness probe (no dependency details)" })
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @Roles("Admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Readiness: database and Redis/queue (Admin only)",
  })
  async ready() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        database: "down",
      });
    }

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

    if (redis === "down") {
      throw new ServiceUnavailableException({
        status: "degraded",
        database: "up",
        redis: "down",
        queues: { [SLA_QUEUE]: "down" },
      });
    }

    return {
      status: "ok",
      database: "up",
      redis: "up",
      queues: {
        [SLA_QUEUE]: "up",
      },
    };
  }
}

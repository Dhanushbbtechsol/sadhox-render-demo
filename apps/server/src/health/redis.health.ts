import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthIndicatorService,
  type HealthCheckAttempt,
} from "@nestjs/terminus";
import Redis from "ioredis";

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly config: ConfigService,
  ) {}

  pingCheck(key = "redis"): HealthCheckAttempt {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        const url = this.config.getOrThrow<string>("REDIS_URL");
        const client = new Redis(url, {
          maxRetriesPerRequest: 1,
          connectTimeout: 3000,
          lazyConnect: true,
        });
        try {
          await client.connect();
          const pong = await client.ping();
          if (pong !== "PONG") {
            throw new Error(`unexpected PING response: ${pong}`);
          }
        } finally {
          client.disconnect();
        }
      })
      .withTimeout(3000);
  }
}

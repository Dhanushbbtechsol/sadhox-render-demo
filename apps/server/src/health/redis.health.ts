import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import Redis from "ioredis";

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly config: ConfigService,
  ) {}

  async pingCheck(key = "redis"): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
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
        return indicator.down({ message: `unexpected PING response: ${pong}` });
      }
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.disconnect();
    }
  }
}

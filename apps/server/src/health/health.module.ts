import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { DrizzleHealthIndicator } from "./drizzle.health";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./redis.health";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}

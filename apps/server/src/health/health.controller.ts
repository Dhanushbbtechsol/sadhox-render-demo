import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from "@nestjs/terminus";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { DrizzleHealthIndicator } from "./drizzle.health";
import { RedisHealthIndicator } from "./redis.health";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DrizzleHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** Liveness — process up; no dependency probes. */
  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe (no dependency details)" })
  live() {
    return { status: "ok" };
  }

  /** Alias for orchestrators that expect /health/live (same as GET /health). */
  @Public()
  @Get("live")
  @ApiOperation({ summary: "Liveness alias (same as GET /health)" })
  liveAlias() {
    return this.live();
  }

  /**
   * Readiness — DB + Redis via Terminus (Admin only).
   *
   * Probe strategy (Phase 3 audit A05): keep Admin gate so Redis/DB details
   * stay off public `/health` and `/health/live`. Orchestrators must call
   * this with a machine Admin JWT (or network policy that injects one).
   * Do not re-expose dependency details on anonymous liveness routes.
   */
  @Get("ready")
  @Roles("Admin")
  @ApiBearerAuth()
  @HealthCheck()
  @ApiOperation({
    summary: "Readiness: database and Redis via Terminus (Admin only)",
  })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.redis.pingCheck("redis"),
    ]);
  }
}

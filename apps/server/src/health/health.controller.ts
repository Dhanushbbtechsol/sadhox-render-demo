import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import { Public } from "../common/decorators/public.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness and database connectivity check" })
  async check() {
    await this.db.execute(sql`select 1`);
    return { status: "ok", database: "up" };
  }
}

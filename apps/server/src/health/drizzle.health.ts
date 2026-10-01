import { Inject, Injectable } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";
import { sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";

@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async pingCheck(key = "database"): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`select 1`);
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

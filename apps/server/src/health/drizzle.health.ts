import { Inject, Injectable } from "@nestjs/common";
import {
  HealthIndicatorService,
  type HealthCheckAttempt,
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

  pingCheck(key = "database"): HealthCheckAttempt {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        await this.db.execute(sql`select 1`);
      })
      .withTimeout(3000);
  }
}

import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { slaRules } from "../database/schema";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { SLA_EVALUATOR_JOB, SLA_QUEUE } from "./queue.constants";

/**
 * Phase 2 skeleton: load SLA rules and log what would be checked.
 * Real breach evaluation lands in Phase 3 — do not invent business logic here.
 */
@Processor(SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SLA_EVALUATOR_JOB) {
      this.logger.debug(`Ignoring unknown sla-queue job name=${job.name}`);
      return;
    }

    const rules = await this.db.select().from(slaRules);
    this.logger.log(
      `SLA skeleton: would evaluate ${rules.length} rule(s) — ` +
        rules
          .map(
            (r) =>
              `${r.priority}: response=${r.responseMinutes}m resolve=${r.resolveMinutes}m`,
          )
          .join("; "),
    );
  }
}

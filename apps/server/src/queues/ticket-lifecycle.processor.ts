import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { TICKET_AUTOCLOSE_JOB, TICKET_LIFECYCLE_QUEUE } from "./queue.constants";

/**
 * Phase 2 skeleton for ticket auto-close.
 * Real lifecycle rules land in Phase 3 — do not invent business logic here.
 */
@Processor(TICKET_LIFECYCLE_QUEUE)
export class TicketLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketLifecycleProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Ticket lifecycle skeleton: job=${job.name || TICKET_AUTOCLOSE_JOB} ` +
        `(no-op until Phase 3)`,
    );
  }
}

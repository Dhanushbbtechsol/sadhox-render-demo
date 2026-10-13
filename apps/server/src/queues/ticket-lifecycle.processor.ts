import { Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { and, eq, lte } from "drizzle-orm";
import { Job } from "bullmq";
import { redactAuditValue } from "../common/audit/redact-audit";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { auditLog, incidents } from "../database/schema";
import { EventsService } from "../events/events.service";
import { TICKET_AUTOCLOSE_JOB, TICKET_LIFECYCLE_QUEUE } from "./queue.constants";

/**
 * Phase 3: auto-close Resolved incidents older than AUTO_CLOSE_DAYS (default 3).
 * System audit uses actor_id NULL (column is nullable — no fabricated user).
 */
@Processor(TICKET_LIFECYCLE_QUEUE)
export class TicketLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketLifecycleProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly events: EventsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== TICKET_AUTOCLOSE_JOB) {
      this.logger.debug(
        `Ignoring unknown ticket-lifecycle job name=${job.name}`,
      );
      return;
    }

    const days = this.config.get<number>("AUTO_CLOSE_DAYS") ?? 3;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const candidates = await this.db
      .select({
        id: incidents.id,
        title: incidents.title,
        status: incidents.status,
        resolvedAt: incidents.resolvedAt,
      })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "Resolved"),
          lte(incidents.resolvedAt, cutoff),
        ),
      );

    this.logger.log(
      `Auto-close: ${candidates.length} Resolved ticket(s) older than ${days}d`,
    );

    for (const ticket of candidates) {
      await this.closeTicket(ticket);
    }
  }

  /** Visible for unit tests — single-ticket system close. */
  async closeTicket(ticket: {
    id: string;
    title: string;
    status: string;
    resolvedAt: Date | null;
  }): Promise<"closed" | "skipped"> {
    const [updated] = await this.db
      .update(incidents)
      .set({
        status: "Closed",
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(incidents.id, ticket.id), eq(incidents.status, "Resolved")))
      .returning({ id: incidents.id });

    if (!updated) {
      return "skipped";
    }

    await this.db.insert(auditLog).values({
      actorId: null,
      action: "system.auto_close",
      entityType: "incident",
      entityId: ticket.id,
      diff: redactAuditValue({
        event: "STATUS_CHANGED",
        title: ticket.title,
        status: { before: "Resolved", after: "Closed" },
        reason: "auto-close after inactivity window",
        resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
        system: true,
      }),
    });

    try {
      this.events.emitTicketUpdated(ticket.id, {
        id: ticket.id,
        status: "Closed",
        closedBy: "system",
        reason: "auto-close",
      });
    } catch (err) {
      this.logger.warn(
        `auto-close WS broadcast skipped for ${ticket.id}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
    }

    return "closed";
  }
}

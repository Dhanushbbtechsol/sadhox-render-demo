import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { Job } from "bullmq";
import { redactAuditValue } from "../common/audit/redact-audit";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { auditLog, incidents, users } from "../database/schema";
import { MailService } from "../mail/mail.service";
import { SLA_EVALUATOR_JOB, SLA_QUEUE } from "./queue.constants";

const ACTIVE_STATUSES = ["New", "Assigned", "InProgress"] as const;

/**
 * Phase 3: find overdue open incidents, flag once, audit, enqueue email.
 * Idempotent: UPDATE … WHERE sla_breached = false RETURNING — second pass no-ops.
 */
@Processor(SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SLA_EVALUATOR_JOB) {
      this.logger.debug(`Ignoring unknown sla-queue job name=${job.name}`);
      return;
    }

    const now = new Date();
    const candidates = await this.db
      .select({
        id: incidents.id,
        title: incidents.title,
        priority: incidents.priority,
        assignedTo: incidents.assignedTo,
        slaDueAt: incidents.slaDueAt,
      })
      .from(incidents)
      .where(
        and(
          inArray(incidents.status, [...ACTIVE_STATUSES]),
          isNotNull(incidents.slaDueAt),
          lte(incidents.slaDueAt, now),
          eq(incidents.slaBreached, false),
        ),
      );

    this.logger.log(`SLA evaluator: ${candidates.length} candidate breach(es)`);

    for (const ticket of candidates) {
      await this.flagBreach(ticket);
    }
  }

  /** Visible for unit tests — single-ticket idempotent breach handling. */
  async flagBreach(ticket: {
    id: string;
    title: string;
    priority: string;
    assignedTo: string | null;
    slaDueAt: Date | null;
  }): Promise<"flagged" | "skipped"> {
    const [updated] = await this.db
      .update(incidents)
      .set({
        slaBreached: true,
        updatedAt: new Date(),
      })
      .where(
        and(eq(incidents.id, ticket.id), eq(incidents.slaBreached, false)),
      )
      .returning({ id: incidents.id });

    if (!updated) {
      return "skipped";
    }

    const diff = redactAuditValue({
      slaBreached: true,
      slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
      priority: ticket.priority,
      previousStatus: "active",
    });

    await this.db.insert(auditLog).values({
      actorId: null,
      action: "system.sla_breach",
      entityType: "incident",
      entityId: ticket.id,
      diff,
    });

    const to = await this.resolveAlertRecipient(ticket.assignedTo);
    if (to) {
      await this.mail.sendSlaBreach(to, {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        priority: ticket.priority,
        breachType: "resolve",
      });
    } else {
      this.logger.warn(
        `SLA breach flagged for ${ticket.id} but no alert recipient found`,
      );
    }

    return "flagged";
  }

  private async resolveAlertRecipient(
    assignedTo: string | null,
  ): Promise<string | null> {
    if (assignedTo) {
      const [agent] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1);
      if (agent?.email) return agent.email;
    }

    const [admin] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, "Admin"))
      .orderBy(asc(users.createdAt))
      .limit(1);
    return admin?.email ?? null;
  }
}

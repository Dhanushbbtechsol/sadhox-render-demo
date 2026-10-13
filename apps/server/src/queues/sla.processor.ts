import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { Job } from "bullmq";
import { redactAuditValue } from "../common/audit/redact-audit";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  auditLog,
  escalationRules,
  incidents,
  slaRules,
  users,
} from "../database/schema";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";
import { SLA_EVALUATOR_JOB, SLA_QUEUE } from "./queue.constants";
import {
  escalationRecipients,
  type EscalationPriority,
} from "./escalation";

const ACTIVE_STATUSES = ["New", "Assigned", "InProgress", "Reopened"] as const;

/**
 * Phase 9: SLA warning at 75% of resolveMinutes (once), then breach when overdue.
 * Recipients via escalationRecipients + in-app notifications.
 */
@Processor(SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SLA_EVALUATOR_JOB) {
      this.logger.debug(`Ignoring unknown sla-queue job name=${job.name}`);
      return;
    }

    const now = new Date();
    await this.processWarnings(now);
    await this.processBreaches(now);
  }

  private async processWarnings(now: Date): Promise<void> {
    const rows = await this.db
      .select({
        id: incidents.id,
        title: incidents.title,
        priority: incidents.priority,
        assignedTo: incidents.assignedTo,
        createdAt: incidents.createdAt,
        resolveMinutes: slaRules.resolveMinutes,
      })
      .from(incidents)
      .innerJoin(slaRules, eq(incidents.priority, slaRules.priority))
      .where(
        and(
          inArray(incidents.status, [...ACTIVE_STATUSES]),
          eq(incidents.slaBreached, false),
          eq(incidents.slaWarned, false),
          isNotNull(incidents.slaDueAt),
        ),
      );

    const candidates = rows.filter((row) => {
      const elapsedMs = now.getTime() - row.createdAt.getTime();
      const thresholdMs = row.resolveMinutes * 60 * 1000 * 0.75;
      return elapsedMs >= thresholdMs;
    });

    this.logger.log(`SLA evaluator: ${candidates.length} warning candidate(s)`);
    for (const ticket of candidates) {
      await this.flagWarning(ticket);
    }
  }

  private async processBreaches(now: Date): Promise<void> {
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

  /** Visible for unit tests — single-ticket idempotent warning. */
  async flagWarning(ticket: {
    id: string;
    title: string;
    priority: string;
    assignedTo: string | null;
  }): Promise<"flagged" | "skipped"> {
    const [updated] = await this.db
      .update(incidents)
      .set({
        slaWarned: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incidents.id, ticket.id),
          eq(incidents.slaWarned, false),
          eq(incidents.slaBreached, false),
        ),
      )
      .returning({ id: incidents.id });

    if (!updated) return "skipped";

    try {
      await this.notifyEscalation(ticket, "warning");
    } catch (err) {
      this.logger.warn(
        `SLA warning notify failed for ${ticket.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return "flagged";
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
      event: "SLA_BREACHED",
      title: ticket.title,
      slaBreached: { before: false, after: true },
      slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
      priority: ticket.priority,
    });

    await this.db.insert(auditLog).values({
      actorId: null,
      action: "system.sla_breach",
      entityType: "incident",
      entityId: ticket.id,
      diff,
    });

    try {
      await this.notifyEscalation(ticket, "breach");
    } catch (err) {
      this.logger.warn(
        `SLA breach notify failed for ${ticket.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return "flagged";
  }

  private async notifyEscalation(
    ticket: {
      id: string;
      title: string;
      priority: string;
      assignedTo: string | null;
    },
    kind: "warning" | "breach",
  ): Promise<void> {
    const priority = ticket.priority as EscalationPriority;
    const [rule] = await this.db
      .select({
        notifyManager: escalationRules.notifyManager,
        notifyAdmin: escalationRules.notifyAdmin,
      })
      .from(escalationRules)
      .where(eq(escalationRules.priority, priority))
      .limit(1);

    let managerId: string | null = null;
    if (ticket.assignedTo) {
      const [assignee] = await this.db
        .select({ reportsToId: users.reportsToId })
        .from(users)
        .where(eq(users.id, ticket.assignedTo))
        .limit(1);
      managerId = assignee?.reportsToId ?? null;
    }

    const admins = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.role, "Admin"));

    const recipientUserIds = escalationRecipients({
      kind,
      priority,
      assigneeId: ticket.assignedTo,
      managerId,
      adminIds: admins.map((a) => a.id),
      notifyManager: rule?.notifyManager ?? true,
      notifyAdmin: rule?.notifyAdmin ?? false,
    });

    if (recipientUserIds.length === 0) {
      this.logger.warn(
        `SLA ${kind} for ${ticket.id} but no escalation recipients`,
      );
      return;
    }

    const rows = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, recipientUserIds));

    const href = `/incidents/${ticket.id}`;
    const title =
      kind === "warning"
        ? `Response time warning: ${ticket.title}`
        : `Response time missed: ${ticket.title}`;
    const body =
      kind === "warning"
        ? `Ticket is at 75% of its resolve target (${ticket.priority}).`
        : `Ticket resolve target missed (${ticket.priority}).`;

    for (const row of rows) {
      if (row.email) {
        await this.mail.sendSlaBreach(row.email, {
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          priority: ticket.priority,
          breachType: "resolve",
          escalationNotes:
            kind === "warning" ? "Response time warning (75%)" : undefined,
        });
      }
      await this.notifications.record(
        row.id,
        kind === "warning" ? "sla.warning" : "sla.breach",
        title,
        body,
        href,
      );
    }
  }
}

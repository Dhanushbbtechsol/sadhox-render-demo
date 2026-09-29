import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import {
  EMAIL_JOB_APPROVAL_OUTCOME,
  EMAIL_JOB_ASSET_NOTIFICATION,
  EMAIL_JOB_SLA_BREACH,
  EMAIL_JOB_TICKET_ASSIGNED,
  maskEmail,
  type ApprovalOutcomeMailData,
  type AssetNotificationMailData,
  type EmailJobPayload,
  type SlaBreachMailData,
  type TicketAssignedMailData,
} from "./mail.types";

/**
 * Typed mail API — only enqueues email-queue jobs.
 * Resend is called exclusively by EmailProcessor.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendTicketAssigned(to: string, data: TicketAssignedMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_TICKET_ASSIGNED,
      to,
      data: {
        ticketId: data.ticketId,
        ticketTitle: data.ticketTitle,
        assigneeName: data.assigneeName,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_TICKET_ASSIGNED, payload, {
      jobId: `${EMAIL_JOB_TICKET_ASSIGNED}:${data.ticketId}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_TICKET_ASSIGNED} to=${maskEmail(to)} ticket=${data.ticketId}`,
    );
  }

  async sendSlaBreach(to: string, data: SlaBreachMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_SLA_BREACH,
      to,
      data: {
        ticketId: data.ticketId,
        ticketTitle: data.ticketTitle,
        priority: data.priority,
        breachType: data.breachType,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_SLA_BREACH, payload, {
      jobId: `${EMAIL_JOB_SLA_BREACH}:${data.ticketId}:${data.breachType}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_SLA_BREACH} to=${maskEmail(to)} ticket=${data.ticketId}`,
    );
  }

  /** Placeholder template — Dev C owns production HTML. */
  async sendApprovalOutcome(to: string, data: ApprovalOutcomeMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_APPROVAL_OUTCOME,
      to,
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        entityTitle: data.entityTitle,
        outcome: data.outcome,
        reason: data.reason,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_APPROVAL_OUTCOME, payload, {
      jobId: `${EMAIL_JOB_APPROVAL_OUTCOME}:${data.entityType}:${data.entityId}:${data.outcome}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_APPROVAL_OUTCOME} to=${maskEmail(to)} ` +
        `${data.entityType}=${data.entityId} outcome=${data.outcome}`,
    );
  }

  /** Phase 3 Day 15 — notify asset owner (placeholder; Dev C owns templates). */
  async sendAssetNotification(to: string, data: AssetNotificationMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_ASSET_NOTIFICATION,
      to,
      data: {
        assetId: data.assetId,
        assetTag: data.assetTag,
        assetName: data.assetName,
        event: data.event,
        ticketId: data.ticketId,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_ASSET_NOTIFICATION, payload, {
      jobId: `${EMAIL_JOB_ASSET_NOTIFICATION}:${data.assetId}:${data.event}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_ASSET_NOTIFICATION} to=${maskEmail(to)} ` +
        `asset=${data.assetId} event=${data.event}`,
    );
  }
}

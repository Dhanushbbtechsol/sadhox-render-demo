import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import {
  EMAIL_JOB_APPROVAL_OUTCOME,
  EMAIL_JOB_ASSET_NOTIFICATION,
  EMAIL_JOB_CHANGE_REVIEW,
  EMAIL_JOB_REQUEST_DECISION,
  EMAIL_JOB_REQUEST_REVIEW,
  EMAIL_JOB_SLA_BREACH,
  EMAIL_JOB_STATUS_CHANGED,
  EMAIL_JOB_TICKET_ASSIGNED,
  maskEmail,
  type ApprovalOutcomeMailData,
  type AssetNotificationMailData,
  type ChangeReviewMailData,
  type EmailJobPayload,
  type RequestDecisionMailData,
  type RequestReviewMailData,
  type SlaBreachMailData,
  type StatusChangedMailData,
  type TicketAssignedMailData,
} from "./mail.types";

/**
 * BullMQ custom jobId cannot contain `:`.
 * Join parts with `|` and strip any remaining colons from emails/etc.
 */
export function buildEmailJobId(...parts: Array<string | number>): string {
  return parts.map((p) => String(p).replace(/:/g, "_")).join("|");
}

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
        priority: data.priority,
        ticketUrl: data.ticketUrl,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_TICKET_ASSIGNED, payload, {
      jobId: buildEmailJobId(EMAIL_JOB_TICKET_ASSIGNED, data.ticketId, to),
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
        escalationNotes: data.escalationNotes,
        ticketUrl: data.ticketUrl,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_SLA_BREACH, payload, {
      jobId: buildEmailJobId(
        EMAIL_JOB_SLA_BREACH,
        data.ticketId,
        data.breachType,
        to,
      ),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_SLA_BREACH} to=${maskEmail(to)} ticket=${data.ticketId}`,
    );
  }

  async sendStatusChanged(to: string, data: StatusChangedMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_STATUS_CHANGED,
      to,
      data: {
        ticketId: data.ticketId,
        ticketTitle: data.ticketTitle,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        actorName: data.actorName,
        remarks: data.remarks,
        ticketUrl: data.ticketUrl,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_STATUS_CHANGED, payload, {
      jobId: buildEmailJobId(
        EMAIL_JOB_STATUS_CHANGED,
        data.ticketId,
        data.newStatus,
        to,
      ),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_STATUS_CHANGED} to=${maskEmail(to)} ticket=${data.ticketId}`,
    );
  }

  async sendRequestDecision(to: string, data: RequestDecisionMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_REQUEST_DECISION,
      to,
      data: {
        requestId: data.requestId,
        requestTitle: data.requestTitle,
        decision: data.decision,
        reason: data.reason,
        comments: data.comments,
        actorName: data.actorName,
        requestUrl: data.requestUrl,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_REQUEST_DECISION, payload, {
      jobId: buildEmailJobId(
        EMAIL_JOB_REQUEST_DECISION,
        data.requestId,
        data.decision,
        to,
      ),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_REQUEST_DECISION} to=${maskEmail(to)} request=${data.requestId}`,
    );
  }

  async sendRequestReviewRequest(to: string, data: RequestReviewMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_REQUEST_REVIEW,
      to,
      data: {
        requestId: data.requestId,
        requestTitle: data.requestTitle,
        submitterName: data.submitterName,
        urgency: data.urgency,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_REQUEST_REVIEW, payload, {
      jobId: buildEmailJobId(EMAIL_JOB_REQUEST_REVIEW, data.requestId, to),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_REQUEST_REVIEW} to=${maskEmail(to)} request=${data.requestId}`,
    );
  }

  async sendChangeReviewRequest(to: string, data: ChangeReviewMailData) {
    const payload: EmailJobPayload = {
      kind: EMAIL_JOB_CHANGE_REVIEW,
      to,
      data: {
        changeId: data.changeId,
        changeTitle: data.changeTitle,
        submitterName: data.submitterName,
        changeType: data.changeType,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_CHANGE_REVIEW, payload, {
      jobId: buildEmailJobId(EMAIL_JOB_CHANGE_REVIEW, data.changeId, to),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_CHANGE_REVIEW} to=${maskEmail(to)} change=${data.changeId}`,
    );
  }

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
      jobId: buildEmailJobId(
        EMAIL_JOB_APPROVAL_OUTCOME,
        data.entityType,
        data.entityId,
        data.outcome,
        to,
      ),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_APPROVAL_OUTCOME} to=${maskEmail(to)} ` +
        `${data.entityType}=${data.entityId} outcome=${data.outcome}`,
    );
  }

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
      jobId: buildEmailJobId(
        EMAIL_JOB_ASSET_NOTIFICATION,
        data.assetId,
        data.event,
        to,
      ),
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_ASSET_NOTIFICATION} to=${maskEmail(to)} ` +
        `asset=${data.assetId} event=${data.event}`,
    );
  }
}

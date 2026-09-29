import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import {
  EMAIL_JOB_CHANGE_REVIEW,
  EMAIL_JOB_REQUEST_DECISION,
  EMAIL_JOB_SLA_BREACH,
  EMAIL_JOB_STATUS_CHANGED,
  EMAIL_JOB_TICKET_ASSIGNED,
  maskEmail,
  type ChangeReviewMailData,
  type EmailJobPayload,
  type RequestDecisionMailData,
  type SlaBreachMailData,
  type StatusChangedMailData,
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
        priority: data.priority,
        ticketUrl: data.ticketUrl,
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
        escalationNotes: data.escalationNotes,
        ticketUrl: data.ticketUrl,
      },
    };
    await this.emailQueue.add(EMAIL_JOB_SLA_BREACH, payload, {
      jobId: `${EMAIL_JOB_SLA_BREACH}:${data.ticketId}:${data.breachType}:${to}`,
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
      jobId: `${EMAIL_JOB_STATUS_CHANGED}:${data.ticketId}:${data.newStatus}:${to}`,
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
      jobId: `${EMAIL_JOB_REQUEST_DECISION}:${data.requestId}:${data.decision}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_REQUEST_DECISION} to=${maskEmail(to)} request=${data.requestId}`,
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
      jobId: `${EMAIL_JOB_CHANGE_REVIEW}:${data.changeId}:${to}`,
    });
    this.logger.log(
      `enqueued ${EMAIL_JOB_CHANGE_REVIEW} to=${maskEmail(to)} change=${data.changeId}`,
    );
  }
}

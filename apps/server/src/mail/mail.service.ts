import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import {
  EMAIL_JOB_SLA_BREACH,
  EMAIL_JOB_TICKET_ASSIGNED,
  maskEmail,
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
}

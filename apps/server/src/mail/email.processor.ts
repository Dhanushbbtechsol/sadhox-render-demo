import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { Job, UnrecoverableError } from "bullmq";
import { createElement, type ReactElement } from "react";
import { Resend } from "resend";
import {
  RequestDecisionEmail,
  SlaBreachAlertEmail,
  StatusChangedEmail,
  TicketAssignedEmail,
} from "../emails";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import { escapeHtml } from "./html-escape";
import { sanitizeEmailSubjectPart } from "../common/sanitize-plain-text";
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
  recipientDomain,
  type EmailJobPayload,
} from "./mail.types";

/** Optional Day 10 hook — report final email failures to Sentry. */
export type EmailFailureReporter = (info: {
  jobId?: string;
  kind: string;
  toMasked: string;
  domain: string;
  error: unknown;
}) => void;

type ResendErrorLike = {
  message?: string;
  name?: string;
  statusCode?: number;
};

/** Map Resend SDK error object → thrown Error / UnrecoverableError for BullMQ. */
export function throwFromResendError(error: ResendErrorLike): never {
  const message = error.message ?? "Resend send failed";
  const status = error.statusCode;
  const permanent4xx =
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 429;
  const validationLike =
    /validation|invalid|not_found|forbidden|unauthorized/i.test(
      `${error.name ?? ""} ${message}`,
    ) && !/rate.?limit|timeout|temporar|unavailable|5\d\d/i.test(message);

  if (permanent4xx || validationLike) {
    throw new UnrecoverableError(message);
  }
  throw new Error(message);
}

@Injectable()
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private failureReporter: EmailFailureReporter | null = null;

  constructor(private readonly config: ConfigService) {
    super();
  }

  /** Wired from ObservabilityModule on Day 10. */
  setFailureReporter(reporter: EmailFailureReporter | null) {
    this.failureReporter = reporter;
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    const payload = job.data;
    if (!payload?.kind || !payload.to || !payload.data) {
      throw new UnrecoverableError("email-queue job has invalid payload shape");
    }

    const toMasked = maskEmail(payload.to);
    const domain = recipientDomain(payload.to);
    const { subject, html, text } = await this.buildTemplate(payload);

    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const mailFrom = this.config.get<string>("MAIL_FROM");
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "development";

    if (!apiKey || nodeEnv === "test") {
      this.logger.log(
        `email dry-run kind=${payload.kind} to=${toMasked} domain=${domain} ` +
          `subject=${subject} (no RESEND_API_KEY or NODE_ENV=test)`,
      );
      return;
    }

    if (!mailFrom) {
      throw new UnrecoverableError(
        "MAIL_FROM is required when RESEND_API_KEY is set",
      );
    }

    const resend = this.createResendClient(apiKey);
    const result = await resend.emails.send({
      from: mailFrom,
      to: payload.to,
      subject,
      html,
      text,
    });

    if (result.error) {
      throwFromResendError(result.error as ResendErrorLike);
    }

    this.logger.log(
      `email sent kind=${payload.kind} to=${toMasked} domain=${domain} id=${result.data?.id ?? "n/a"}`,
    );
  }

  /** Overridable for unit tests (mock Resend SDK). */
  createResendClient(apiKey: string): Resend {
    return new Resend(apiKey);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<EmailJobPayload> | undefined, error: Error) {
    if (!job) return;
    const unrecoverable = error.name === "UnrecoverableError";
    const attempts = job.opts.attempts ?? 1;
    const isFinal =
      unrecoverable || (job.attemptsMade ?? 0) >= attempts;
    if (!isFinal) {
      this.logger.warn(
        `email retry kind=${job.data?.kind ?? "unknown"} ` +
          `attempt=${job.attemptsMade}/${attempts} to=${maskEmail(job.data?.to ?? "")}`,
      );
      return;
    }

    const toMasked = maskEmail(job.data?.to ?? "");
    const domain = recipientDomain(job.data?.to ?? "");
    this.logger.error(
      `email final failure kind=${job.data?.kind ?? "unknown"} to=${toMasked} domain=${domain}: ${error.message}`,
    );

    try {
      this.failureReporter?.({
        jobId: job.id,
        kind: job.data?.kind ?? "unknown",
        toMasked,
        domain,
        error,
      });
    } catch (hookErr) {
      this.logger.error(
        "email failure reporter hook threw",
        hookErr instanceof Error ? hookErr.message : String(hookErr),
      );
    }
  }

  async buildTemplate(payload: EmailJobPayload): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const webOrigin =
      this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:5173";

    if (payload.kind === EMAIL_JOB_CHANGE_REVIEW) {
      const d = payload.data;
      const title = escapeHtml(d.changeTitle);
      const changeId = escapeHtml(d.changeId);
      const submitter = escapeHtml(d.submitterName);
      const changeType = escapeHtml(d.changeType);
      const subject = `[Sadhox] Change review needed: ${sanitizeEmailSubjectPart(d.changeTitle)}`;
      const text = `${d.submitterName} submitted ${d.changeType} change ${d.changeId} for review.`;
      const html = `<p><strong>${submitter}</strong> submitted a <strong>${changeType}</strong> change for review:</p><p><strong>${title}</strong> (${changeId})</p>`;
      return { subject, html, text };
    }

    if (payload.kind === EMAIL_JOB_REQUEST_REVIEW) {
      const d = payload.data;
      const title = escapeHtml(d.requestTitle);
      const requestId = escapeHtml(d.requestId);
      const submitter = escapeHtml(d.submitterName);
      const urgency = escapeHtml(d.urgency);
      const subject = `[Sadhox] Service request approval needed: ${sanitizeEmailSubjectPart(d.requestTitle)}`;
      const text = `${d.submitterName} submitted service request ${d.requestId} (${d.urgency}) for approval.`;
      const html = `<p><strong>${submitter}</strong> submitted a service request for approval:</p><p><strong>${title}</strong> (${requestId}) — urgency <strong>${urgency}</strong></p>`;
      return { subject, html, text };
    }

    if (payload.kind === EMAIL_JOB_APPROVAL_OUTCOME) {
      const d = payload.data;
      const title = escapeHtml(d.entityTitle);
      const entityId = escapeHtml(d.entityId);
      const entityType = escapeHtml(d.entityType);
      const outcome = escapeHtml(d.outcome);
      const reason = d.reason ? escapeHtml(d.reason) : null;
      const subject = `[Sadhox] ${sanitizeEmailSubjectPart(d.entityType)} ${sanitizeEmailSubjectPart(d.outcome)}: ${sanitizeEmailSubjectPart(d.entityTitle)}`;
      const text =
        `${d.entityType} ${d.entityId} was ${d.outcome}.` +
        (d.reason ? ` Reason: ${d.reason}` : "");
      const html =
        `<p>${entityType} ${entityId} was <strong>${outcome}</strong>: ${title}</p>` +
        (reason ? `<p>Reason: ${reason}</p>` : "");
      return { subject, html, text };
    }

    if (payload.kind === EMAIL_JOB_ASSET_NOTIFICATION) {
      const d = payload.data;
      const tag = escapeHtml(d.assetTag);
      const name = escapeHtml(d.assetName);
      const assetId = escapeHtml(d.assetId);
      const event = escapeHtml(d.event);
      const ticketId = d.ticketId ? escapeHtml(d.ticketId) : null;
      const subject = `[Sadhox] Asset ${sanitizeEmailSubjectPart(d.event)}: ${sanitizeEmailSubjectPart(d.assetTag)}`;
      const text =
        `Asset ${d.assetTag} (${d.assetId}) event=${d.event}` +
        (d.ticketId ? ` ticket=${d.ticketId}` : "");
      const html =
        `<p>Asset <strong>${tag}</strong> (${name}) — ${event}</p>` +
        `<p>id=${assetId}</p>` +
        (ticketId ? `<p>Linked ticket: ${ticketId}</p>` : "");
      return { subject, html, text };
    }

    let subject: string;
    let element: ReactElement;
    let text: string;

    if (payload.kind === EMAIL_JOB_TICKET_ASSIGNED) {
      const d = payload.data;
      const ticketUrl =
        d.ticketUrl ?? `${webOrigin}/incidents/${d.ticketId}`;
      subject = `[Sadhox] Ticket assigned: ${sanitizeEmailSubjectPart(d.ticketTitle)}`;
      text = `Ticket ${d.ticketId} (${d.priority ?? "P3"}) assigned to ${d.assigneeName}: ${d.ticketTitle}. ${ticketUrl}`;
      element = createElement(TicketAssignedEmail, {
        ticketId: d.ticketId,
        ticketTitle: d.ticketTitle,
        assigneeName: d.assigneeName,
        priority: d.priority ?? "P3",
        ticketUrl,
      });
    } else if (payload.kind === EMAIL_JOB_SLA_BREACH) {
      const d = payload.data;
      const ticketUrl =
        d.ticketUrl ?? `${webOrigin}/incidents/${d.ticketId}`;
      subject = `[Sadhox] SLA ${sanitizeEmailSubjectPart(d.breachType)} breach: ${sanitizeEmailSubjectPart(d.ticketTitle)}`;
      text = `SLA ${d.breachType} breach on ${d.ticketId} (${d.priority}): ${d.ticketTitle}. ${ticketUrl}`;
      element = createElement(SlaBreachAlertEmail, {
        ticketId: d.ticketId,
        ticketTitle: d.ticketTitle,
        priority: d.priority,
        breachType: d.breachType,
        escalationNotes: d.escalationNotes,
        ticketUrl,
      });
    } else if (payload.kind === EMAIL_JOB_STATUS_CHANGED) {
      const d = payload.data;
      const ticketUrl =
        d.ticketUrl ?? `${webOrigin}/incidents/${d.ticketId}`;
      subject = `[Sadhox] Status ${sanitizeEmailSubjectPart(d.previousStatus)} → ${sanitizeEmailSubjectPart(d.newStatus)}: ${sanitizeEmailSubjectPart(d.ticketTitle)}`;
      text = `Ticket ${d.ticketId} status changed from ${d.previousStatus} to ${d.newStatus} by ${d.actorName}. ${d.remarks ?? ""} ${ticketUrl}`;
      element = createElement(StatusChangedEmail, {
        ticketId: d.ticketId,
        ticketTitle: d.ticketTitle,
        previousStatus: d.previousStatus,
        newStatus: d.newStatus,
        actorName: d.actorName,
        remarks: d.remarks,
        ticketUrl,
      });
    } else if (payload.kind === EMAIL_JOB_REQUEST_DECISION) {
      const d = payload.data;
      const requestUrl = d.requestUrl ?? `${webOrigin}/requests`;
      const comments = d.comments ?? d.reason;
      subject = `[Sadhox] Request ${sanitizeEmailSubjectPart(d.decision)}: ${sanitizeEmailSubjectPart(d.requestTitle)}`;
      text = `Request ${d.requestId} ${d.decision}${d.actorName ? ` by ${d.actorName}` : ""}. ${comments ?? ""} ${requestUrl}`;
      element = createElement(RequestDecisionEmail, {
        requestId: d.requestId,
        requestTitle: d.requestTitle,
        decision: d.decision,
        comments,
        actorName: d.actorName,
        requestUrl,
      });
    } else {
      const _exhaustive: never = payload;
      throw new UnrecoverableError(
        `unsupported email job kind: ${(_exhaustive as EmailJobPayload).kind}`,
      );
    }

    const html = await render(element);
    return { subject, html, text };
  }

  /** @deprecated use buildTemplate — kept for older unit tests that call sync placeholder */
  buildPlaceholderTemplate(payload: EmailJobPayload): {
    subject: string;
    html: string;
    text: string;
  } {
    void payload;
    throw new Error("Use buildTemplate (async React Email render)");
  }
}

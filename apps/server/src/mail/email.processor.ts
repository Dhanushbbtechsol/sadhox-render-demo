import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, UnrecoverableError } from "bullmq";
import { Resend } from "resend";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import { escapeHtml } from "./html-escape";
import {
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
    const { subject, html, text } = this.buildPlaceholderTemplate(payload);

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

  buildPlaceholderTemplate(payload: EmailJobPayload): {
    subject: string;
    html: string;
    text: string;
  } {
    // Minimal placeholder — Dev C owns production HTML templates.
    // HTML-escape all ticket-derived fields used in HTML.
    if (payload.kind === EMAIL_JOB_TICKET_ASSIGNED) {
      const title = escapeHtml(payload.data.ticketTitle);
      const ticketId = escapeHtml(payload.data.ticketId);
      const assignee = escapeHtml(payload.data.assigneeName);
      const subject = `[Sadhox] Ticket assigned: ${payload.data.ticketTitle}`;
      const text = `Ticket ${payload.data.ticketId} assigned to ${payload.data.assigneeName}.`;
      const html = `<p>Ticket ${ticketId} assigned to ${assignee}: <strong>${title}</strong></p><p><em>Placeholder template (Dev C).</em></p>`;
      return { subject, html, text };
    }

    const title = escapeHtml(payload.data.ticketTitle);
    const ticketId = escapeHtml(payload.data.ticketId);
    const priority = escapeHtml(payload.data.priority);
    const breachType = escapeHtml(payload.data.breachType);
    const subject = `[Sadhox] SLA ${payload.data.breachType} breach: ${payload.data.ticketTitle}`;
    const text = `SLA ${payload.data.breachType} breach on ${payload.data.ticketId} (${payload.data.priority}).`;
    const html = `<p>SLA ${breachType} breach on ${ticketId} (${priority}): <strong>${title}</strong></p><p><em>Placeholder template (Dev C).</em></p>`;
    return { subject, html, text };
  }
}

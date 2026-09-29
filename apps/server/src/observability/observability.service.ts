import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";
import { QueueEvents } from "bullmq";
import { EmailProcessor } from "../mail/email.processor";
import {
  EMAIL_QUEUE,
  SLA_QUEUE,
  TICKET_LIFECYCLE_QUEUE,
} from "../queues/queue.constants";

function scrubSentryEvent<T extends Sentry.ErrorEvent>(event: T): T | null {
  if (event.request) {
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
    }
    delete event.request.cookies;
    delete event.request.data;
  }
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      if (/password|token|secret|authorization|cookie/i.test(key)) {
        delete event.extra[key];
      }
    }
  }
  return event;
}

@Injectable()
export class ObservabilityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObservabilityService.name);
  private queueEvents: QueueEvents[] = [];
  private sentryEnabled = false;

  constructor(
    private readonly config: ConfigService,
    private readonly emailProcessor: EmailProcessor,
  ) {}

  onModuleInit() {
    this.initSentry();
    this.wireEmailFailureReporter();
    void this.wireBullmqFailureEvents();
  }

  async onModuleDestroy() {
    await Promise.all(
      this.queueEvents.map(async (ev) => {
        try {
          await ev.close();
        } catch {
          /* ignore */
        }
      }),
    );
  }

  private initSentry() {
    const dsn = this.config.get<string>("SENTRY_DSN");
    if (!dsn) {
      this.logger.log("SENTRY_DSN not set — Sentry disabled");
      return;
    }

    Sentry.init({
      dsn,
      environment: this.config.get<string>("NODE_ENV") ?? "development",
      tracesSampleRate: 0,
      beforeSend(event) {
        return scrubSentryEvent(event);
      },
    });
    this.sentryEnabled = true;
    this.logger.log("Sentry initialized");
  }

  private wireEmailFailureReporter() {
    if (!this.sentryEnabled) {
      this.emailProcessor.setFailureReporter(null);
      return;
    }
    this.emailProcessor.setFailureReporter((info) => {
      Sentry.withScope((scope) => {
        scope.setTag("queue", EMAIL_QUEUE);
        scope.setTag("email.kind", info.kind);
        scope.setExtra("toMasked", info.toMasked);
        scope.setExtra("domain", info.domain);
        scope.setExtra("jobId", info.jobId);
        Sentry.captureException(
          info.error instanceof Error
            ? info.error
            : new Error(String(info.error)),
        );
      });
    });
  }

  private async wireBullmqFailureEvents() {
    if (!this.sentryEnabled) return;

    const url = this.config.getOrThrow<string>("REDIS_URL");
    const names = [SLA_QUEUE, TICKET_LIFECYCLE_QUEUE, EMAIL_QUEUE];

    for (const name of names) {
      const events = new QueueEvents(name, { connection: { url } });
      events.on("failed", ({ jobId, failedReason }) => {
        Sentry.withScope((scope) => {
          scope.setTag("queue", name);
          scope.setExtra("jobId", jobId);
          Sentry.captureMessage(
            `BullMQ job failed: ${name} ${jobId}: ${failedReason}`,
            "error",
          );
        });
      });
      this.queueEvents.push(events);
    }
    this.logger.log("BullMQ failure events wired to Sentry");
  }
}

import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { MailModule } from "../mail/mail.module";
import { loggerModule } from "./logger.config";
import { ObservabilityService } from "./observability.service";
import { SentryExceptionFilter } from "./sentry-exception.filter";

@Module({
  imports: [loggerModule, MailModule],
  providers: [
    ObservabilityService,
    { provide: APP_FILTER, useClass: SentryExceptionFilter },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}

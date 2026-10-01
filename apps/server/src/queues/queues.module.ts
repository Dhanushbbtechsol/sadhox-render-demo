import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { MailModule } from "../mail/mail.module";
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_QUEUE,
  SLA_QUEUE,
  TICKET_LIFECYCLE_QUEUE,
} from "./queue.constants";
import { SlaProcessor } from "./sla.processor";
import { SlaScheduleService } from "./sla-schedule.service";
import { AutoCloseScheduleService } from "./auto-close-schedule.service";
import { TicketLifecycleProcessor } from "./ticket-lifecycle.processor";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>("REDIS_URL");
        // BullMQ requires maxRetriesPerRequest=null on its ioredis connection.
        return {
          connection: {
            url,
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
          },
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    BullModule.registerQueue(
      { name: SLA_QUEUE },
      { name: TICKET_LIFECYCLE_QUEUE },
      { name: EMAIL_QUEUE },
    ),
    MailModule,
  ],
  providers: [
    SlaProcessor,
    TicketLifecycleProcessor,
    SlaScheduleService,
    AutoCloseScheduleService,
  ],
  exports: [BullModule],
})
export class QueuesModule {}

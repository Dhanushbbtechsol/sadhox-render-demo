import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_QUEUE,
  SLA_QUEUE,
  TICKET_LIFECYCLE_QUEUE,
} from "./queue.constants";
import { SlaProcessor } from "./sla.processor";
import { SlaScheduleService } from "./sla-schedule.service";
import { TicketLifecycleProcessor } from "./ticket-lifecycle.processor";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>("REDIS_URL");
        return {
          connection: { url },
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    BullModule.registerQueue(
      { name: SLA_QUEUE },
      { name: TICKET_LIFECYCLE_QUEUE },
      { name: EMAIL_QUEUE },
    ),
  ],
  providers: [SlaProcessor, TicketLifecycleProcessor, SlaScheduleService],
  exports: [BullModule],
})
export class QueuesModule {}

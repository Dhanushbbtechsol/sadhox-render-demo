import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ensureAutoCloseSchedule } from "./auto-close-schedule";
import { TICKET_LIFECYCLE_QUEUE } from "./queue.constants";

@Injectable()
export class AutoCloseScheduleService implements OnModuleInit {
  private readonly logger = new Logger(AutoCloseScheduleService.name);

  constructor(
    @InjectQueue(TICKET_LIFECYCLE_QUEUE)
    private readonly lifecycleQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const cron =
      this.config.get<string>("AUTO_CLOSE_CRON") ?? "0 2 * * *";
    const { created } = await ensureAutoCloseSchedule(
      this.lifecycleQueue,
      cron,
    );
    this.logger.log(
      created
        ? `Registered idempotent auto-close job (cron=${cron})`
        : `Auto-close job already present (cron=${cron}) — skipped duplicate`,
    );
  }
}

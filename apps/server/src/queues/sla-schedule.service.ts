import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { SLA_QUEUE } from "./queue.constants";
import { ensureSlaRepeatableSchedule } from "./sla-schedule";

@Injectable()
export class SlaScheduleService implements OnModuleInit {
  private readonly logger = new Logger(SlaScheduleService.name);

  constructor(@InjectQueue(SLA_QUEUE) private readonly slaQueue: Queue) {}

  async onModuleInit() {
    const { created } = await ensureSlaRepeatableSchedule(this.slaQueue);
    this.logger.log(
      created
        ? "Registered idempotent SLA repeatable job (every 5m)"
        : "SLA repeatable job already present — skipped duplicate",
    );
  }
}

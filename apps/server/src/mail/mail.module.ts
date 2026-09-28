import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EMAIL_QUEUE } from "../queues/queue.constants";
import { EmailProcessor } from "./email.processor";
import { MailService } from "./mail.service";

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [MailService, EmailProcessor],
  exports: [MailService, EmailProcessor],
})
export class MailModule {}

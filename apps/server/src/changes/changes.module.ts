import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { ChangesController } from "./changes.controller";
import { ChangesService } from "./changes.service";

@Module({
  imports: [MailModule],
  controllers: [ChangesController],
  providers: [ChangesService],
  exports: [ChangesService],
})
export class ChangesModule {}

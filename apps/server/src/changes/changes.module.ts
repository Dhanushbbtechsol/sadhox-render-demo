import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { ChangesController } from "./changes.controller";
import { ChangesService } from "./changes.service";

@Module({
  imports: [MailModule, NotificationsModule, ProjectsModule],
  controllers: [ChangesController],
  providers: [ChangesService],
  exports: [ChangesService],
})
export class ChangesModule {}

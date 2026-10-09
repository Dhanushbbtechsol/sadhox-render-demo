import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotificationService } from "./notification.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}

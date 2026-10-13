import { Module } from "@nestjs/common";
import { AssignmentModule } from "../assignment/assignment.module";
import { AssetsModule } from "../assets/assets.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { IncidentCategoriesService } from "./incident-categories.service";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";
import { PriorityCalculationService } from "./priority-calculation.service";

@Module({
  imports: [
    AssignmentModule,
    MailModule,
    NotificationsModule,
    AssetsModule,
    ProjectsModule,
  ],
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    PriorityCalculationService,
    IncidentCategoriesService,
  ],
  exports: [
    IncidentsService,
    PriorityCalculationService,
    IncidentCategoriesService,
  ],
})
export class IncidentsModule {}

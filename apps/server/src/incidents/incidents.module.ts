import { Module } from "@nestjs/common";
import { AssignmentModule } from "../assignment/assignment.module";
import { AssetsModule } from "../assets/assets.module";
import { MailModule } from "../mail/mail.module";
import { ProjectsModule } from "../projects/projects.module";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";
import { PriorityCalculationService } from "./priority-calculation.service";

@Module({
  imports: [AssignmentModule, MailModule, AssetsModule, ProjectsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, PriorityCalculationService],
  exports: [IncidentsService, PriorityCalculationService],
})
export class IncidentsModule {}

import { Module } from "@nestjs/common";
import { AssignmentModule } from "../assignment/assignment.module";
import { MailModule } from "../mail/mail.module";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";
import { PriorityCalculationService } from "./priority-calculation.service";

@Module({
  imports: [AssignmentModule, MailModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, PriorityCalculationService],
  exports: [IncidentsService, PriorityCalculationService],
})
export class IncidentsModule {}

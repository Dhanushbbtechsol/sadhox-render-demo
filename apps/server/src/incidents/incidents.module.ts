import { Module } from "@nestjs/common";
import { AssignmentModule } from "../assignment/assignment.module";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";
import { PriorityCalculationService } from "./priority-calculation.service";

@Module({
  imports: [AssignmentModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, PriorityCalculationService],
  exports: [IncidentsService, PriorityCalculationService],
})
export class IncidentsModule {}

import { Module } from "@nestjs/common";
import { IncidentsController } from "./incidents.controller";
import { IncidentsService } from "./incidents.service";
import { PriorityCalculationService } from "./priority-calculation.service";

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService, PriorityCalculationService],
  exports: [IncidentsService, PriorityCalculationService],
})
export class IncidentsModule {}

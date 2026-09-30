import { Module } from "@nestjs/common";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";

/** Shared assignment — imported by IncidentsModule and others. */
@Module({
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}

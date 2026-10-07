import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";

/** Shared assignment — imported by IncidentsModule and others. */
@Module({
  imports: [ProjectsModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}


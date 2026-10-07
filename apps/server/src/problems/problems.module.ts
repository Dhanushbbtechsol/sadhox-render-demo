import { Module } from "@nestjs/common";
import { AssignmentModule } from "../assignment/assignment.module";
import { ProjectsModule } from "../projects/projects.module";
import { ProblemsController } from "./problems.controller";
import { ProblemsService } from "./problems.service";

@Module({
  imports: [AssignmentModule, ProjectsModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}

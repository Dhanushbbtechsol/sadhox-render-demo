import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { ProblemsController } from "./problems.controller";
import { ProblemsService } from "./problems.service";

@Module({
  imports: [ProjectsModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
  exports: [ProblemsService],
})
export class ProblemsModule {}

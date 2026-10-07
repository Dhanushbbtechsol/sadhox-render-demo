import { Module } from "@nestjs/common";
import { ManagerDashboardController } from "./manager-dashboard.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  controllers: [ProjectsController, ManagerDashboardController],
  providers: [ProjectAccessService, ProjectsService],
  exports: [ProjectAccessService, ProjectsService],
})
export class ProjectsModule {}

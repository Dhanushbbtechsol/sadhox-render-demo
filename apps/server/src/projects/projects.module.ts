import { Module } from "@nestjs/common";
import { ManagerDashboardController } from "./manager-dashboard.controller";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  controllers: [ProjectsController, ManagerDashboardController],
  providers: [ProjectScopeService, ProjectAccessService, ProjectsService],
  exports: [ProjectScopeService, ProjectAccessService, ProjectsService],
})
export class ProjectsModule {}

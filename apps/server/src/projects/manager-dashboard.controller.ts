import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ChartRangePreset } from "../admin/chart-range";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ProjectsService } from "./projects.service";

@ApiTags("manager")
@ApiBearerAuth()
@Controller("manager/dashboard")
@Roles("Manager")
export class ManagerDashboardController {
  constructor(private readonly projects: ProjectsService) {}

  @Get("stats")
  @ApiOperation({
    summary: "KPIs for projects owned by the current Manager",
  })
  stats(@CurrentUser() user: AuthUser) {
    return this.projects.managerDashboardStats(user);
  }

  @Get("charts")
  @ApiOperation({
    summary:
      "Volume and SLA charts for projects owned by the current Manager (server-scoped)",
  })
  charts(
    @CurrentUser() user: AuthUser,
    @Query("range") range?: string,
  ) {
    const preset: ChartRangePreset =
      range === "7d" || range === "ytd" || range === "30d" ? range : "30d";
    return this.projects.managerCharts(user, preset);
  }
}

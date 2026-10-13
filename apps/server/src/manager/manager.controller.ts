import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { THROTTLE_DESK_REPORT } from "../common/throttle.constants";
import { AdminService } from "../admin/admin.service";
import { DeskReportQueryDto } from "../admin/dto/desk-report-query.dto";

@ApiTags("manager")
@ApiBearerAuth()
@Controller("manager")
@Roles("Manager")
export class ManagerController {
  constructor(private readonly admin: AdminService) {}

  @Get("reports/desk")
  @Throttle(THROTTLE_DESK_REPORT)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Phase 9 desk report for the manager's team (range=7d|30d|ytd, format=json|csv)",
  })
  async deskReport(
    @CurrentUser() user: AuthUser,
    @Query() query: DeskReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const range = query.range ?? "30d";
    const format = query.format ?? "json";
    const result = await this.admin.deskReportResponse(
      range,
      format,
      "Team",
      user.userId,
    );
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      return result.body;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return result.body;
  }
}

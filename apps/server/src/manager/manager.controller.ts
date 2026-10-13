import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { THROTTLE_REPORT } from "../common/throttle.constants";
import type { Response } from "express";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminService } from "../admin/admin.service";
import { DeskReportQueryDto } from "../admin/dto/desk-report-query.dto";

@ApiTags("manager")
@ApiBearerAuth()
@Controller("manager")
@Roles("Manager")
export class ManagerController {
  constructor(private readonly admin: AdminService) {}

  @Get("reports/desk")
  @Throttle(THROTTLE_REPORT)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Desk report for the manager's team (range=7d|30d|quarter|ytd|year, format=json|csv|excel)",
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
    if (format === "csv" || format === "excel") {
      const contentType =
        result.contentType ??
        (format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8");
      const filename =
        result.filename ??
        `desk-report.${format === "excel" ? "xlsx" : "csv"}`;
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      if (Buffer.isBuffer(result.body)) {
        return new StreamableFile(result.body, {
          type: contentType,
          disposition: `attachment; filename="${filename}"`,
        });
      }
      return result.body;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return result.body;
  }
}

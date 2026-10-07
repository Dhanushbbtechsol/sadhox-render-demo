import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminService } from "./admin.service";
import { ChartRangeQueryDto } from "./dto/chart-range-query.dto";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import {
  UpdateSlaRuleDto,
  UpdateSlaRulePathBodyDto,
} from "./dto/sla-rule.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: ["Admin", "Agent", "Manager", "EndUser"] })
  @IsOptional()
  @IsIn(["Admin", "Agent", "Manager", "EndUser"])
  role?: "Admin" | "Agent" | "Manager" | "EndUser";
}

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@Roles("Admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard/stats")
  @ApiOperation({ summary: "Executive KPI aggregates" })
  stats() {
    return this.admin.dashboardStats();
  }

  @Get("dashboard/tickets-by-status")
  @ApiOperation({ summary: "Ticket volume by status, priority, and module" })
  ticketsByStatus() {
    return this.admin.ticketsByStatus();
  }

  @Get("dashboard/sla-performance")
  @ApiOperation({ summary: "Weekly SLA met vs breached for incidents" })
  slaPerformance() {
    return this.admin.slaPerformance();
  }

  @Get("charts/volume-by-module")
  @ApiOperation({ summary: "Stacked ticket volume by module for a date range" })
  volumeByModule(@Query() query: ChartRangeQueryDto) {
    return this.admin.volumeByModule(query.range ?? "30d");
  }

  @Get("charts/status-distribution")
  @ApiOperation({ summary: "Status distribution donut for a date range" })
  statusDistribution(@Query() query: ChartRangeQueryDto) {
    return this.admin.statusDistribution(query.range ?? "30d");
  }

  @Get("charts/sla-compliance")
  @ApiOperation({ summary: "SLA compliance rate for a date range" })
  slaCompliance(@Query() query: ChartRangeQueryDto) {
    return this.admin.slaCompliance(query.range ?? "30d");
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Paginated audit log with actor and date filters" })
  auditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.admin.listAuditLogs(query);
  }

  @Get("queues")
  @ApiOperation({ summary: "BullMQ queue job counts for admin monitor" })
  queues() {
    return this.admin.queueHealth();
  }

  @Get("users")
  @ApiOperation({
    summary: "List users filtered by role (Admin) — member/manager pickers",
  })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query.role);
  }

  @Get("sla-rules")
  @ApiOperation({
    summary: "List SLA response/resolve thresholds per priority (Admin)",
  })
  listSlaRules() {
    return this.admin.listSlaRules();
  }

  /**
   * Body-only PATCH — frontend fallback when path form is unavailable.
   * Primary client call is PATCH /admin/sla-rules/:priority.
   */
  @Patch("sla-rules")
  @ApiOperation({
    summary: "Update SLA minutes by priority in body (Admin)",
  })
  updateSlaRuleBody(@Body() dto: UpdateSlaRuleDto) {
    return this.admin.updateSlaRule(dto.priority, dto);
  }

  @Patch("sla-rules/:priority")
  @ApiOperation({
    summary: "Update SLA minutes for a priority (Admin) — preferred by web UI",
  })
  updateSlaRuleByPriority(
    @Param("priority") priority: string,
    @Body() dto: UpdateSlaRulePathBodyDto,
  ) {
    return this.admin.updateSlaRule(priority, dto);
  }

  @Patch("users/:id/role")
  @ApiOperation({
    summary:
      "Update user role (Admin). Promoting to Manager clears project_members atomically.",
  })
  updateUserRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(id, dto.role);
  }
}

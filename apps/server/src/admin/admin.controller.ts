import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsOptional } from "class-validator";
import type { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminService } from "./admin.service";
import { ChartRangeQueryDto } from "./dto/chart-range-query.dto";
import { DeskReportQueryDto } from "./dto/desk-report-query.dto";
import {
  UpdateEscalationRuleBodyDto,
  UpdateEscalationRuleDto,
} from "./dto/escalation-rule.dto";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import {
  UpdateSlaRuleDto,
  UpdateSlaRulePathBodyDto,
} from "./dto/sla-rule.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

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

  @Get("dashboard/report")
  @Roles("Admin")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Phase 9 desk report (range=7d|30d|ytd, format=json|csv). Scope All.",
  })
  async dashboardReport(
    @Query() query: DeskReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const range = query.range ?? "30d";
    const format = query.format ?? "json";
    const result = await this.admin.deskReportResponse(range, format, "All");
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
    summary: "List users filtered by role (Admin) — no password hashes",
  })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query.role);
  }

  @Post("users")
  @HttpCode(201)
  @ApiOperation({
    summary:
      "Create a user (Admin). Optional reportsToId (Manager/Admin). Unique email → 409.",
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Get user by id (Admin) — no password hash" })
  getUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.getUser(id);
  }

  @Patch("users/:id")
  @ApiOperation({
    summary:
      "Update name, email, password, role, and/or reportsToId (Admin). Promoting to Manager clears project_members.",
  })
  updateUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(id, dto);
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

  @Get("escalation-rules")
  @ApiOperation({
    summary: "List SLA escalation notify flags per priority (Admin)",
  })
  listEscalationRules() {
    return this.admin.listEscalationRules();
  }

  @Patch("escalation-rules")
  @ApiOperation({
    summary: "Update escalation rule by priority in body (Admin)",
  })
  updateEscalationRuleBody(@Body() dto: UpdateEscalationRuleBodyDto) {
    return this.admin.updateEscalationRule(dto.priority, dto);
  }

  @Patch("escalation-rules/:priority")
  @ApiOperation({
    summary: "Update escalation notifyManager/notifyAdmin for a priority",
  })
  updateEscalationRuleByPriority(
    @Param("priority") priority: string,
    @Body() dto: UpdateEscalationRuleDto,
  ) {
    return this.admin.updateEscalationRule(priority, dto);
  }
}

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
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsOptional } from "class-validator";
import type { Response } from "express";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { THROTTLE_REPORT } from "../common/throttle.constants";
import { AdminService } from "./admin.service";
import { ChartRangeQueryDto } from "./dto/chart-range-query.dto";
import {
  DashboardReportQueryDto,
  resolveTypedReportFormat,
} from "./dto/dashboard-report-query.dto";
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
import { UserActivityQueryDto } from "./dto/user-activity-query.dto";
import { IncidentCategoriesService } from "../incidents/incident-categories.service";
import {
  CreateIncidentCategoryDto,
  CreateIncidentSubcategoryDto,
  UpdateIncidentCategoryDto,
  UpdateIncidentSubcategoryDto,
} from "../incidents/dto/incident-category.dto";

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
  constructor(
    private readonly admin: AdminService,
    private readonly categories: IncidentCategoriesService,
  ) {}

  @Get("dashboard/stats")
  @ApiOperation({ summary: "Executive KPI aggregates" })
  stats() {
    return this.admin.dashboardStats();
  }

  @Get("dashboard/report")
  @Roles("Admin")
  @Throttle(THROTTLE_REPORT)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Desk report (no type: format=json|csv) or typed export (type=summary|all|assigned|in-progress|approved|open|assets).",
  })
  async dashboardReport(
    @Query() query: DashboardReportQueryDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const range = query.range ?? "30d";

    if (query.type) {
      const typedFormat = resolveTypedReportFormat(query.type, query.format);
      const result = await this.admin.dashboardReportCsv(
        range,
        query.type,
        user.userId,
        typedFormat,
        query.module,
        query.from,
        query.to,
      );
      return attachmentResponse(res, result);
    }

    const deskFormat =
      query.format === "csv"
        ? "csv"
        : query.format === "excel"
          ? "excel"
          : "json";
    const result = await this.admin.deskReportResponse(
      range,
      deskFormat,
      "All",
    );
    if (deskFormat === "csv" || deskFormat === "excel") {
      return attachmentResponse(res, {
        body: result.body as string | Buffer,
        filename: result.filename ?? `desk-report.${deskFormat === "excel" ? "xlsx" : "csv"}`,
        contentType:
          result.contentType ??
          (deskFormat === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8"),
      });
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

  @Get("reports/user-activity")
  @Throttle(THROTTLE_REPORT)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Individual user activity (tickets reported/assigned, requests, changes, audit logs) for 7d|30d|ytd|custom",
  })
  userActivity(@Query() query: UserActivityQueryDto) {
    return this.admin.userActivityReport(query);
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

  @Get("incident-categories")
  @ApiOperation({
    summary: "List ticket categories and subcategories (includes inactive)",
  })
  listIncidentCategories() {
    return this.categories.listTaxonomy({ includeInactive: true });
  }

  @Post("incident-categories")
  @HttpCode(201)
  @ApiOperation({ summary: "Create a ticket category" })
  createIncidentCategory(@Body() dto: CreateIncidentCategoryDto) {
    return this.categories.createCategory(dto.name);
  }

  @Patch("incident-categories/:id")
  @ApiOperation({ summary: "Rename or activate/deactivate a ticket category" })
  updateIncidentCategory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentCategoryDto,
  ) {
    return this.categories.updateCategory(id, dto);
  }

  @Post("incident-subcategories")
  @HttpCode(201)
  @ApiOperation({
    summary: "Create a subcategory with optional minimum priority (SLA floor)",
  })
  createIncidentSubcategory(@Body() dto: CreateIncidentSubcategoryDto) {
    return this.categories.createSubcategory(dto);
  }

  @Patch("incident-subcategories/:id")
  @ApiOperation({
    summary: "Update subcategory name, min priority, or active flag",
  })
  updateIncidentSubcategory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentSubcategoryDto,
  ) {
    return this.categories.updateSubcategory(id, dto);
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

/** Send CSV/XLSX without Nest JSON-encoding Buffer bodies. */
function attachmentResponse(
  res: Response,
  result: { body: string | Buffer; filename: string; contentType: string },
): StreamableFile | string {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`,
  );
  if (Buffer.isBuffer(result.body)) {
    return new StreamableFile(result.body, {
      type: result.contentType,
      disposition: `attachment; filename="${result.filename}"`,
    });
  }
  return result.body;
}

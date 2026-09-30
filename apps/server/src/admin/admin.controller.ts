import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminService } from "./admin.service";
import { ChartRangeQueryDto } from "./dto/chart-range-query.dto";
import { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";

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
}

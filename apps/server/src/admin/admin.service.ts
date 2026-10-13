import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Queue } from "bullmq";
import {
  computeSlaComplianceRate,
  resolveActivityRange,
  resolveChartRange,
  stackOpenClosed,
  type ChartRangePreset,
} from "./chart-range";
import type { UserActivityQueryDto } from "./dto/user-activity-query.dto";
import {
  buildTidyFiguresCsvDocument,
  dashboardReportFilename,
  REPORT_ROW_CAP,
  REPORT_STATUS_FILTER,
  type ReportType,
  type TicketReportRow,
} from "./dashboard-report-csv";
import type { ReportFormat } from "./dto/dashboard-report-query.dto";
import {
  WORK_GROUPS_NOTE,
  buildSummaryWorkbookXml,
  buildTidyFigureRows,
  buildWorkGroupRows,
  summaryFiguresCsvFilename,
  summaryWorkbookFilename,
  type OverviewMetric,
  type SummaryWorkbookData,
} from "./dashboard-report-workbook";
import {
  type DeskReport,
  type DeskReportRange,
} from "./desk-report";
import {
  buildAssetExportCsv,
  buildAssetExportXlsx,
  buildDeskExportCsv,
  buildDeskExportXlsx,
  buildTicketExportCsv,
  buildTicketExportXlsx,
  exportFilename,
} from "./exports";
import { assertReportsTo } from "./org-chart";
import { assertPasswordComplexity } from "../common/password-policy";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type { UserRole } from "../common/types/roles";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { claimReference } from "../incidents/reference";
import {
  assets,
  auditLog,
  changes,
  escalationRules,
  incidents,
  projectMembers,
  projects,
  serviceCatalog,
  serviceRequests,
  slaRules,
  users,
  type Priority,
} from "../database/schema";
import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import {
  ESCALATION_PRIORITIES,
  type EscalationPriority,
  type UpdateEscalationRuleDto,
} from "./dto/escalation-rule.dto";
import {
  SLA_PRIORITIES,
  type SlaPriority,
  type UpdateSlaRuleMinutesDto,
} from "./dto/sla-rule.dto";
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import {
  EMAIL_QUEUE,
  SLA_QUEUE,
  TICKET_LIFECYCLE_QUEUE,
} from "../queues/queue.constants";

export type AdminUserView = {
  id: string;
  referenceCode: string;
  name: string;
  email: string;
  role: UserRole;
  reportsToId: string | null;
};

const QUEUE_PURPOSE: Record<string, string> = {
  [SLA_QUEUE]:
    "Checks tickets every 5 minutes for missed response times and emails the right people.",
  [TICKET_LIFECYCLE_QUEUE]:
    "Auto-closes tickets that stay Resolved long enough with no further action.",
  [EMAIL_QUEUE]: "Sends the emails the app queues (assignments, approvals, alerts).",
};

/** Everyday titles for queue cards (API still returns the BullMQ name). */
const QUEUE_TITLE: Record<string, string> = {
  [SLA_QUEUE]: "Response time checks",
  [TICKET_LIFECYCLE_QUEUE]: "Ticket auto-close",
  [EMAIL_QUEUE]: "Email sending",
};

const USER_PUBLIC_COLS = {
  id: users.id,
  referenceCode: users.referenceCode,
  name: users.name,
  email: users.email,
  role: users.role,
  reportsToId: users.reportsToId,
} as const;

function formatSlaWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return weekStart;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(SLA_QUEUE) private readonly slaQueue: Queue,
    @InjectQueue(TICKET_LIFECYCLE_QUEUE) private readonly lifecycleQueue: Queue,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  /**
   * Admin dashboard report — summary workbook/CSV or ticket CSV by type.
   */
  async dashboardReportCsv(
    rangePreset: ChartRangePreset = "30d",
    type: ReportType = "summary",
    actorId?: string,
    format: ReportFormat = "excel",
  ): Promise<{
    body: string | Buffer;
    filename: string;
    contentType: string;
  }> {
    const now = new Date();
    const { from, to } = resolveChartRange(rangePreset, now);

    if (type === "summary") {
      return this.buildSummaryReport(rangePreset, from, to, now, format, actorId);
    }

    if (type === "assets") {
      return this.buildAssetsReport(rangePreset, from, to, now, format, actorId);
    }

    const tickets = await this.fetchReportTickets(type, from, to, this.db);
    if (tickets.length > REPORT_ROW_CAP) {
      throw new UnprocessableEntityException(
        `Report exceeds ${REPORT_ROW_CAP} rows. Narrow the range or use format=csv on a smaller type.`,
      );
    }
    if (actorId) {
      await this.writeReportAudit(actorId, type, format, rangePreset, tickets.length);
    }
    if (format === "excel") {
      return buildTicketExportXlsx(tickets, {
        range: rangePreset,
        from,
        to,
        type,
        generatedAt: now,
      });
    }
    return {
      body: buildTicketExportCsv(tickets),
      filename: exportFilename({
        report: `tickets-${type}`,
        scope: "all",
        from,
        to,
        ext: "csv",
        now,
      }),
      contentType: "text/csv; charset=utf-8",
    };
  }

  /** Assets created in the selected dashboard range. */
  private async buildAssetsReport(
    rangePreset: ChartRangePreset,
    from: Date,
    to: Date,
    now: Date,
    format: ReportFormat,
    actorId?: string,
  ): Promise<{ body: string | Buffer; filename: string; contentType: string }> {
    const owner = alias(users, "report_asset_owner");
    const rows = await this.db
      .select({
        referenceCode: assets.referenceCode,
        assetTag: assets.assetTag,
        name: assets.name,
        type: assets.type,
        status: assets.status,
        ownerName: owner.name,
        ownerEmail: owner.email,
        serialNumber: assets.serialNumber,
        location: assets.location,
        purchaseCost: assets.purchaseCost,
        linkedTicketId: assets.linkedTicketId,
        assignedAt: assets.assignedAt,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .leftJoin(owner, eq(assets.ownerId, owner.id))
      .where(and(gte(assets.createdAt, from), lte(assets.createdAt, to)))
      .orderBy(desc(assets.createdAt))
      .limit(REPORT_ROW_CAP + 1);

    if (rows.length > REPORT_ROW_CAP) {
      throw new UnprocessableEntityException(
        `Report exceeds ${REPORT_ROW_CAP} rows. Narrow the range.`,
      );
    }

    if (actorId) {
      await this.writeReportAudit(
        actorId,
        "assets",
        format,
        rangePreset,
        rows.length,
      );
    }

    if (format === "excel") {
      return buildAssetExportXlsx(rows, {
        range: rangePreset,
        from,
        to,
        generatedAt: now,
      });
    }

    return {
      body: buildAssetExportCsv(rows),
      filename: exportFilename({
        report: "assets",
        scope: "all",
        from,
        to,
        ext: "csv",
        now,
      }),
      contentType: "text/csv; charset=utf-8",
    };
  }

  private async writeReportAudit(
    actorId: string,
    type: ReportType,
    format: ReportFormat,
    range: ChartRangePreset,
    rowCount: number,
  ) {
    await this.db.insert(auditLog).values({
      actorId,
      action: "report.export",
      entityType: "dashboard_report",
      entityId: null,
      diff: { type, format, range, rowCount },
    });
  }

  private async buildSummaryReport(
    rangePreset: ChartRangePreset,
    from: Date,
    to: Date,
    now: Date,
    format: ReportFormat,
    actorId?: string,
  ): Promise<{ body: string; filename: string; contentType: string }> {
    const data = await this.db.transaction(
      async (tx) => {
        const tickets = await this.fetchReportTickets("all", from, to, tx);
        if (tickets.length > REPORT_ROW_CAP) {
          throw new UnprocessableEntityException(
            `Report exceeds ${REPORT_ROW_CAP} rows. Narrow the range or use format=csv.`,
          );
        }

        const [volume, statusDist, slaComp, priorityRows, slaWeeks, dashStats] =
          await Promise.all([
            this.queryVolumeByModule(tx, from, to, rangePreset),
            this.queryStatusDistribution(tx, from, to, rangePreset),
            this.querySlaCompliance(tx, from, to, rangePreset),
            this.queryPriorityCountsInRange(tx, from, to),
            this.querySlaWeeksInRange(tx, from, to),
            this.queryDashboardStatsSnapshot(tx),
          ]);

        const byModule = volume.data;
        const rangeTotal = tickets.length;
        const rangeOpen = byModule.reduce((sum, m) => sum + m.open, 0);
        const rangeClosed = byModule.reduce((sum, m) => sum + m.closed, 0);
        const p1InRange = tickets.filter(
          (t) => t.module === "Incident" && t.priority === "P1",
        ).length;

        const overview: OverviewMetric[] = [
          {
            metric: "Total tickets (range)",
            value: rangeTotal,
            unit: "count",
            definition:
              "Tickets created in the selected range (reconciles with By Module and Tickets).",
          },
          {
            metric: "Open tickets (range)",
            value: rangeOpen,
            unit: "count",
            definition:
              "Open counts from volume-by-module rules for tickets created in range.",
          },
          {
            metric: "Closed tickets (range)",
            value: rangeClosed,
            unit: "count",
            definition: "Closed counts from volume-by-module rules; Open + Closed = Total per module.",
          },
          {
            metric: "P1 incidents (range)",
            value: p1InRange,
            unit: "count",
            definition: "Incidents in range with priority P1.",
          },
          {
            metric: "SLA compliance (range)",
            value: slaComp.rate,
            unit: "%",
            definition:
              "Resolved incidents with SLA due in range (same as dashboard SLA gauge). Empty if no samples.",
          },
          {
            metric: "Dashboard: Total tickets",
            value: dashStats.totalTickets,
            unit: "count",
            definition: "KPI card — all-time (not range-filtered).",
          },
          {
            metric: "Dashboard: Open tickets",
            value: dashStats.openTickets,
            unit: "count",
            definition: "KPI card — all-time open incidents + requests.",
          },
          {
            metric: "Dashboard: P1 incidents",
            value: dashStats.p1Incidents,
            unit: "count",
            definition: "KPI card — all-time P1 incidents.",
          },
          {
            metric: "Dashboard: SLA compliance",
            value: dashStats.slaCompliance,
            unit: "%",
            definition: "KPI card — all resolved SLA samples (all-time).",
          },
          {
            metric: "Range",
            value: rangePreset,
            unit: "",
            definition:
              "7d | 30d | quarter | ytd | year window used for range-scoped sheets.",
          },
          {
            metric: "Generated at (UTC)",
            value: now.toISOString().replace("T", " ").slice(0, 19),
            unit: "",
            definition: "Fixed clock for this workbook (REPEATABLE READ).",
          },
        ];

        const workbook: SummaryWorkbookData = {
          period: { range: rangePreset, from, to, generatedAt: now },
          overview,
          byModule,
          byStatus: statusDist.data.map((r) => ({
            module: r.module,
            status: r.label,
            count: r.count,
          })),
          workGroups: buildWorkGroupRows(tickets),
          workGroupsNote: WORK_GROUPS_NOTE,
          byPriority: priorityRows,
          slaCompliance: {
            met: slaComp.met,
            breached: slaComp.breached,
            rate:
              slaComp.met + slaComp.breached === 0 ? null : slaComp.rate,
          },
          slaWeeks: slaWeeks.map((row) => ({
            weekStart: row.weekStart,
            label: formatSlaWeekLabel(row.weekStart),
            met: row.met,
            breached: row.breached,
          })),
          tickets,
        };
        return workbook;
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );

    let body: string;
    let filename: string;
    let contentType: string;
    let rowCount: number;

    if (format === "csv") {
      const tidy = buildTidyFigureRows(data);
      body = buildTidyFiguresCsvDocument(tidy);
      filename = summaryFiguresCsvFilename(rangePreset, now);
      contentType = "text/csv; charset=utf-8";
      rowCount = tidy.length;
    } else {
      body = buildSummaryWorkbookXml(data);
      filename = summaryWorkbookFilename(rangePreset, now);
      contentType = "application/vnd.ms-excel; charset=utf-8";
      rowCount = data.tickets.length;
    }

    if (actorId) {
      await this.writeReportAudit(actorId, "summary", format, rangePreset, rowCount);
    }

    return { body, filename, contentType };
  }

  private async fetchReportTickets(
    type: Exclude<ReportType, "summary" | "assets">,
    from: Date,
    to: Date,
    db: DrizzleDB,
  ): Promise<TicketReportRow[]> {
    const statusFilter =
      type === "all" ? null : REPORT_STATUS_FILTER[type];

    const incidentStatuses = statusFilter?.incidents;
    const srStatuses = statusFilter?.serviceRequests;
    const changeStatuses = statusFilter?.changes;

    const fetchIncidents =
      type === "all" || (incidentStatuses && incidentStatuses.length > 0);
    const fetchSr = type === "all" || (srStatuses && srStatuses.length > 0);
    const fetchChanges =
      type === "all" || (changeStatuses && changeStatuses.length > 0);

    const [incidentRows, srRows, changeRows] = await Promise.all([
      fetchIncidents
        ? this.queryIncidentReportRows(
            db,
            from,
            to,
            type === "all" ? undefined : incidentStatuses,
          )
        : Promise.resolve([] as TicketReportRow[]),
      fetchSr
        ? this.queryServiceRequestReportRows(
            db,
            from,
            to,
            type === "all" ? undefined : srStatuses,
          )
        : Promise.resolve([] as TicketReportRow[]),
      fetchChanges
        ? this.queryChangeReportRows(
            db,
            from,
            to,
            type === "all" ? undefined : changeStatuses,
          )
        : Promise.resolve([] as TicketReportRow[]),
    ]);

    return [...incidentRows, ...srRows, ...changeRows];
  }

  private async queryVolumeByModule(
    db: DrizzleDB,
    from: Date,
    to: Date,
    range: ChartRangePreset,
  ) {
    const [incidentAgg] = await db
      .select({
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        closed: sql<number>`count(*) filter (where ${incidents.status} in ('Resolved','Closed'))`,
      })
      .from(incidents)
      .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)));

    const [srAgg] = await db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected'))`,
        closed: sql<number>`count(*) filter (where ${serviceRequests.status} in ('Fulfilled','Closed','Rejected'))`,
      })
      .from(serviceRequests)
      .where(
        and(
          gte(serviceRequests.createdAt, from),
          lte(serviceRequests.createdAt, to),
        ),
      );

    const [changeAgg] = await db
      .select({
        open: sql<number>`count(*) filter (where ${changes.status} not in ('Completed','Closed','Cancelled','Failed','RolledBack'))`,
        closed: sql<number>`count(*) filter (where ${changes.status} in ('Completed','Closed','Cancelled','Failed','RolledBack'))`,
      })
      .from(changes)
      .where(and(gte(changes.createdAt, from), lte(changes.createdAt, to)));

    return {
      range,
      data: [
        {
          module: "Ticket",
          ...stackOpenClosed(
            Number(incidentAgg?.open ?? 0),
            Number(incidentAgg?.closed ?? 0),
          ),
        },
        {
          module: "Request",
          ...stackOpenClosed(
            Number(srAgg?.open ?? 0),
            Number(srAgg?.closed ?? 0),
          ),
        },
        {
          module: "Change request",
          ...stackOpenClosed(
            Number(changeAgg?.open ?? 0),
            Number(changeAgg?.closed ?? 0),
          ),
        },
      ],
    };
  }

  private async queryStatusDistribution(
    db: DrizzleDB,
    from: Date,
    to: Date,
    range: ChartRangePreset,
  ) {
    const [incidentRows, requestRows, changeRows] = await Promise.all([
      db
        .select({ status: incidents.status, count: count() })
        .from(incidents)
        .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)))
        .groupBy(incidents.status),
      db
        .select({ status: serviceRequests.status, count: count() })
        .from(serviceRequests)
        .where(
          and(
            gte(serviceRequests.createdAt, from),
            lte(serviceRequests.createdAt, to),
          ),
        )
        .groupBy(serviceRequests.status),
      db
        .select({ status: changes.status, count: count() })
        .from(changes)
        .where(and(gte(changes.createdAt, from), lte(changes.createdAt, to)))
        .groupBy(changes.status),
    ]);

    const data = [
      ...incidentRows.map((r) => ({
        module: "Ticket",
        label: r.status,
        count: Number(r.count),
      })),
      ...requestRows.map((r) => ({
        module: "Request",
        label: r.status,
        count: Number(r.count),
      })),
      ...changeRows.map((r) => ({
        module: "Change request",
        label: r.status,
        count: Number(r.count),
      })),
    ].filter((row) => row.count > 0);

    return { range, data };
  }

  private async querySlaCompliance(
    db: DrizzleDB,
    from: Date,
    to: Date,
    range: ChartRangePreset,
  ) {
    const [agg] = await db
      .select({
        met: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        breached: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} > ${incidents.slaDueAt}
        )`,
      })
      .from(incidents)
      .where(
        and(
          sql`${incidents.resolvedAt} is not null`,
          gte(incidents.resolvedAt, from),
          lte(incidents.resolvedAt, to),
        ),
      );
    const met = Number(agg?.met ?? 0);
    const breached = Number(agg?.breached ?? 0);
    return {
      range,
      met,
      breached,
      rate: computeSlaComplianceRate(met, breached),
    };
  }

  private async queryPriorityCountsInRange(
    db: DrizzleDB,
    from: Date,
    to: Date,
  ) {
    const rows = await db
      .select({
        priority: incidents.priority,
        count: count(),
      })
      .from(incidents)
      .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)))
      .groupBy(incidents.priority);
    return rows.map((r) => ({
      priority: r.priority,
      count: Number(r.count),
    }));
  }

  private async querySlaWeeksInRange(db: DrizzleDB, from: Date, to: Date) {
    const rows = await db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${incidents.resolvedAt}), 'YYYY-MM-DD')`,
        met: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        breached: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} > ${incidents.slaDueAt}
        )`,
      })
      .from(incidents)
      .where(
        and(
          sql`${incidents.resolvedAt} is not null`,
          gte(incidents.resolvedAt, from),
          lte(incidents.resolvedAt, to),
        ),
      )
      .groupBy(sql`date_trunc('week', ${incidents.resolvedAt})`)
      .orderBy(sql`date_trunc('week', ${incidents.resolvedAt})`);

    return rows.map((row) => ({
      weekStart: row.weekStart,
      met: Number(row.met),
      breached: Number(row.breached),
    }));
  }

  private async queryDashboardStatsSnapshot(db: DrizzleDB) {
    const [incidentAgg] = await db
      .select({
        total: count(),
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        p1: sql<number>`count(*) filter (where ${incidents.priority} = 'P1')`,
        slaMet: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        slaTotal: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
        )`,
      })
      .from(incidents);

    const [srCount] = await db.select({ total: count() }).from(serviceRequests);
    const [changeCount] = await db.select({ total: count() }).from(changes);
    const [srOpen] = await db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected','Draft'))`,
      })
      .from(serviceRequests);

    const totalTickets =
      Number(incidentAgg?.total ?? 0) +
      Number(srCount?.total ?? 0) +
      Number(changeCount?.total ?? 0);
    const openTickets =
      Number(incidentAgg?.open ?? 0) + Number(srOpen?.open ?? 0);
    const p1 = Number(incidentAgg?.p1 ?? 0);
    const slaTotal = Number(incidentAgg?.slaTotal ?? 0);
    const slaMet = Number(incidentAgg?.slaMet ?? 0);
    const slaCompliance =
      slaTotal === 0 ? 100 : Math.round((slaMet / slaTotal) * 1000) / 10;

    return {
      totalTickets,
      openTickets,
      p1Incidents: p1,
      slaCompliance,
    };
  }

  private async queryIncidentReportRows(
    db: DrizzleDB,
    from: Date,
    to: Date,
    statuses?: string[],
  ): Promise<TicketReportRow[]> {
    const reporter = alias(users, "report_incident_reporter");
    const assignee = alias(users, "report_incident_assignee");
    const filters = [
      gte(incidents.createdAt, from),
      lte(incidents.createdAt, to),
    ];
    if (statuses && statuses.length > 0) {
      filters.push(
        inArray(
          incidents.status,
          statuses as Array<
            "New" | "Assigned" | "InProgress" | "Resolved" | "Closed"
          >,
        ),
      );
    }

    const rows = await db
      .select({
        id: incidents.id,
        referenceCode: incidents.referenceCode,
        title: incidents.title,
        status: incidents.status,
        priority: incidents.priority,
        category: incidents.category,
        subcategory: incidents.subcategory,
        projectName: projects.name,
        assignedTo: assignee.name,
        raisedBy: reporter.name,
        createdAt: incidents.createdAt,
        updatedAt: incidents.updatedAt,
        slaDueAt: incidents.slaDueAt,
        slaBreached: incidents.slaBreached,
        resolvedAt: incidents.resolvedAt,
        closedAt: incidents.closedAt,
        description: incidents.description,
      })
      .from(incidents)
      .leftJoin(projects, eq(incidents.projectId, projects.id))
      .leftJoin(reporter, eq(incidents.reporterId, reporter.id))
      .leftJoin(assignee, eq(incidents.assignedTo, assignee.id))
      .where(and(...filters))
      .limit(REPORT_ROW_CAP + 1);

    return rows.map((row) => ({
      id: row.id,
      referenceCode: row.referenceCode ?? "",
      module: "Incident" as const,
      title: row.title,
      status: row.status,
      priority: row.priority,
      category: row.category,
      subcategory: row.subcategory,
      projectName: row.projectName,
      assignedTo: row.assignedTo,
      raisedBy: row.raisedBy,
      approvedBy: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      slaDueAt: row.slaDueAt,
      slaBreached: row.slaBreached,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
      approvedAt: null,
      description: row.description,
    }));
  }

  private async queryServiceRequestReportRows(
    db: DrizzleDB,
    from: Date,
    to: Date,
    statuses?: string[],
  ): Promise<TicketReportRow[]> {
    const requester = alias(users, "report_sr_requester");
    const assignee = alias(users, "report_sr_assignee");
    const approver = alias(users, "report_sr_approver");
    const filters = [
      gte(serviceRequests.createdAt, from),
      lte(serviceRequests.createdAt, to),
    ];
    if (statuses && statuses.length > 0) {
      filters.push(
        inArray(
          serviceRequests.status,
          statuses as Array<
            | "Draft"
            | "Submitted"
            | "PendingApproval"
            | "Approved"
            | "Rejected"
            | "InFulfillment"
            | "Fulfilled"
            | "Closed"
          >,
        ),
      );
    }

    const rows = await db
      .select({
        id: serviceRequests.id,
        referenceCode: serviceRequests.referenceCode,
        title: serviceRequests.title,
        status: serviceRequests.status,
        urgency: serviceRequests.urgency,
        category: serviceCatalog.department,
        subcategory: serviceCatalog.subcategory,
        projectName: projects.name,
        assignedTo: assignee.name,
        raisedBy: requester.name,
        approvedBy: approver.name,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        approvedAt: serviceRequests.approvedAt,
        description: serviceRequests.description,
      })
      .from(serviceRequests)
      .leftJoin(
        serviceCatalog,
        eq(serviceRequests.catalogId, serviceCatalog.id),
      )
      .leftJoin(projects, eq(serviceRequests.projectId, projects.id))
      .leftJoin(requester, eq(serviceRequests.requesterId, requester.id))
      .leftJoin(assignee, eq(serviceRequests.assigneeId, assignee.id))
      .leftJoin(approver, eq(serviceRequests.approverId, approver.id))
      .where(and(...filters))
      .limit(REPORT_ROW_CAP + 1);

    return rows.map((row) => ({
      id: row.id,
      referenceCode: row.referenceCode ?? "",
      module: "Service Request" as const,
      title: row.title,
      status: row.status,
      priority: row.urgency,
      category: row.category,
      subcategory: row.subcategory,
      projectName: row.projectName,
      assignedTo: row.assignedTo,
      raisedBy: row.raisedBy,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      slaDueAt: null,
      slaBreached: null,
      resolvedAt: null,
      closedAt: null,
      approvedAt: row.approvedAt,
      description: row.description,
    }));
  }

  private async queryChangeReportRows(
    db: DrizzleDB,
    from: Date,
    to: Date,
    statuses?: string[],
  ): Promise<TicketReportRow[]> {
    const creator = alias(users, "report_change_creator");
    const approver = alias(users, "report_change_approver");
    const filters = [
      gte(changes.createdAt, from),
      lte(changes.createdAt, to),
    ];
    if (statuses && statuses.length > 0) {
      filters.push(
        inArray(
          changes.status,
          statuses as Array<
            | "Draft"
            | "PendingApproval"
            | "Submitted"
            | "Approved"
            | "Scheduled"
            | "Implementing"
            | "Implemented"
            | "Completed"
            | "Closed"
            | "Failed"
            | "RolledBack"
            | "Cancelled"
          >,
        ),
      );
    }

    const rows = await db
      .select({
        id: changes.id,
        referenceCode: changes.referenceCode,
        title: changes.title,
        status: changes.status,
        projectName: projects.name,
        raisedBy: creator.name,
        approvedBy: approver.name,
        createdAt: changes.createdAt,
        updatedAt: changes.updatedAt,
        approvedAt: changes.approvedAt,
        description: changes.description,
      })
      .from(changes)
      .leftJoin(projects, eq(changes.projectId, projects.id))
      .leftJoin(creator, eq(changes.createdBy, creator.id))
      .leftJoin(approver, eq(changes.approvedBy, approver.id))
      .where(and(...filters))
      .limit(REPORT_ROW_CAP + 1);

    return rows.map((row) => ({
      id: row.id,
      referenceCode: row.referenceCode ?? "",
      module: "Change" as const,
      title: row.title,
      status: row.status,
      priority: null,
      category: null,
      subcategory: null,
      projectName: row.projectName,
      assignedTo: null,
      raisedBy: row.raisedBy,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      slaDueAt: null,
      slaBreached: null,
      resolvedAt: null,
      closedAt: null,
      approvedAt: row.approvedAt,
      description: row.description,
    }));
  }

  async dashboardStats() {
    const [incidentAgg] = await this.db
      .select({
        total: count(),
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        p1: sql<number>`count(*) filter (where ${incidents.priority} = 'P1')`,
        slaMet: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        slaTotal: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
        )`,
      })
      .from(incidents);

    const [srCount] = await this.db.select({ total: count() }).from(serviceRequests);
    const [changeCount] = await this.db.select({ total: count() }).from(changes);

    const [srOpen] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected','Draft'))`,
      })
      .from(serviceRequests);

    const totalTickets =
      Number(incidentAgg?.total ?? 0) +
      Number(srCount?.total ?? 0) +
      Number(changeCount?.total ?? 0);
    const openTickets =
      Number(incidentAgg?.open ?? 0) + Number(srOpen?.open ?? 0);
    const p1 = Number(incidentAgg?.p1 ?? 0);
    const slaTotal = Number(incidentAgg?.slaTotal ?? 0);
    const slaMet = Number(incidentAgg?.slaMet ?? 0);
    const slaCompliance = slaTotal === 0 ? 100 : Math.round((slaMet / slaTotal) * 1000) / 10;

    return {
      kpis: [
        {
          id: "total",
          label: "Total tickets",
          value: String(totalTickets),
          delta: "Live aggregate",
          trend: "flat" as const,
        },
        {
          id: "open",
          label: "Open tickets",
          value: String(openTickets),
          delta: "Tickets + requests",
          trend: openTickets > 0 ? ("up" as const) : ("flat" as const),
        },
        {
          id: "p1",
          label: "P1 tickets",
          value: String(p1),
          delta: "Current P1 count",
          trend: p1 > 0 ? ("up" as const) : ("flat" as const),
        },
        {
          id: "sla",
          label: "Response time met",
          value: `${slaCompliance}%`,
          delta:
            slaTotal === 0
              ? "No resolved response-time samples"
              : `${slaMet}/${slaTotal} met`,
          trend: slaCompliance >= 90 ? ("up" as const) : ("down" as const),
        },
      ],
      totals: {
        totalTickets,
        openTickets,
        p1Incidents: p1,
        slaCompliance,
      },
    };
  }

  async ticketsByStatus() {
    const [incidentRows, requestRows, changeRows] = await Promise.all([
      this.db
        .select({
          status: incidents.status,
          count: count(),
        })
        .from(incidents)
        .groupBy(incidents.status),
      this.db
        .select({
          status: serviceRequests.status,
          count: count(),
        })
        .from(serviceRequests)
        .groupBy(serviceRequests.status),
      this.db
        .select({
          status: changes.status,
          count: count(),
        })
        .from(changes)
        .groupBy(changes.status),
    ]);

    const byModule = [
      {
        module: "Incident",
        rows: incidentRows.map((r) => ({
          label: r.status,
          count: Number(r.count),
        })),
      },
      {
        module: "Service Request",
        rows: requestRows.map((r) => ({
          label: r.status,
          count: Number(r.count),
        })),
      },
      {
        module: "Change",
        rows: changeRows.map((r) => ({
          label: r.status,
          count: Number(r.count),
        })),
      },
    ];

    const ticketsByStatus = incidentRows.map((r) => ({
      label: r.status,
      count: Number(r.count),
    }));

    const priorityRows = await this.db
      .select({
        priority: incidents.priority,
        count: count(),
      })
      .from(incidents)
      .groupBy(incidents.priority);

    return {
      ticketsByStatus,
      ticketsByPriority: priorityRows.map((r) => ({
        label: r.priority,
        count: Number(r.count),
      })),
      ticketsByModule: byModule.map((m) => ({
        label: m.module,
        count: m.rows.reduce((sum, row) => sum + row.count, 0),
      })),
      byModule,
    };
  }

  async slaPerformance() {
    const rows = await this.db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${incidents.resolvedAt}), 'YYYY-MM-DD')`,
        met: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        breached: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} > ${incidents.slaDueAt}
        )`,
      })
      .from(incidents)
      .where(sql`${incidents.resolvedAt} is not null`)
      .groupBy(sql`date_trunc('week', ${incidents.resolvedAt})`)
      .orderBy(sql`date_trunc('week', ${incidents.resolvedAt})`);

    return {
      data: rows.map((row) => ({
        weekStart: row.weekStart,
        met: Number(row.met),
        breached: Number(row.breached),
      })),
    };
  }

  async volumeByModule(rangePreset: ChartRangePreset = "30d") {
    const { range, from, to } = resolveChartRange(rangePreset);

    const [incidentAgg] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        closed: sql<number>`count(*) filter (where ${incidents.status} in ('Resolved','Closed'))`,
      })
      .from(incidents)
      .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)));

    const [srAgg] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected'))`,
        closed: sql<number>`count(*) filter (where ${serviceRequests.status} in ('Fulfilled','Closed','Rejected'))`,
      })
      .from(serviceRequests)
      .where(
        and(
          gte(serviceRequests.createdAt, from),
          lte(serviceRequests.createdAt, to),
        ),
      );

    const [changeAgg] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${changes.status} not in ('Completed','Closed','Cancelled','Failed','RolledBack'))`,
        closed: sql<number>`count(*) filter (where ${changes.status} in ('Completed','Closed','Cancelled','Failed','RolledBack'))`,
      })
      .from(changes)
      .where(and(gte(changes.createdAt, from), lte(changes.createdAt, to)));

    const data = [
      {
        module: "Ticket",
        ...stackOpenClosed(
          Number(incidentAgg?.open ?? 0),
          Number(incidentAgg?.closed ?? 0),
        ),
      },
      {
        module: "Request",
        ...stackOpenClosed(Number(srAgg?.open ?? 0), Number(srAgg?.closed ?? 0)),
      },
      {
        module: "Change request",
        ...stackOpenClosed(
          Number(changeAgg?.open ?? 0),
          Number(changeAgg?.closed ?? 0),
        ),
      },
    ];

    return {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      data,
    };
  }

  async statusDistribution(rangePreset: ChartRangePreset = "30d") {
    const { range, from, to } = resolveChartRange(rangePreset);

    const [incidentRows, requestRows, changeRows] = await Promise.all([
      this.db
        .select({ status: incidents.status, count: count() })
        .from(incidents)
        .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)))
        .groupBy(incidents.status),
      this.db
        .select({ status: serviceRequests.status, count: count() })
        .from(serviceRequests)
        .where(
          and(
            gte(serviceRequests.createdAt, from),
            lte(serviceRequests.createdAt, to),
          ),
        )
        .groupBy(serviceRequests.status),
      this.db
        .select({ status: changes.status, count: count() })
        .from(changes)
        .where(and(gte(changes.createdAt, from), lte(changes.createdAt, to)))
        .groupBy(changes.status),
    ]);

    const data = [
      ...incidentRows.map((r) => ({
        status: `Incident:${r.status}`,
        module: "Ticket",
        label: r.status,
        count: Number(r.count),
      })),
      ...requestRows.map((r) => ({
        status: `ServiceRequest:${r.status}`,
        module: "Request",
        label: r.status,
        count: Number(r.count),
      })),
      ...changeRows.map((r) => ({
        status: `Change:${r.status}`,
        module: "Change request",
        label: r.status,
        count: Number(r.count),
      })),
    ].filter((row) => row.count > 0);

    return {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      data,
    };
  }

  async slaCompliance(rangePreset: ChartRangePreset = "30d") {
    const { range, from, to } = resolveChartRange(rangePreset);

    const [agg] = await this.db
      .select({
        met: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} <= ${incidents.slaDueAt}
        )`,
        breached: sql<number>`count(*) filter (
          where ${incidents.slaDueAt} is not null
            and ${incidents.resolvedAt} is not null
            and ${incidents.resolvedAt} > ${incidents.slaDueAt}
        )`,
      })
      .from(incidents)
      .where(
        and(
          sql`${incidents.resolvedAt} is not null`,
          gte(incidents.resolvedAt, from),
          lte(incidents.resolvedAt, to),
        ),
      );

    const met = Number(agg?.met ?? 0);
    const breached = Number(agg?.breached ?? 0);

    return {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      met,
      breached,
      rate: computeSlaComplianceRate(met, breached),
    };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const offset = (page - 1) * limit;

    const filters = [];
    if (query.actorId) {
      filters.push(eq(auditLog.actorId, query.actorId));
    }
    if (query.from) {
      filters.push(gte(auditLog.createdAt, new Date(query.from)));
    }
    if (query.to) {
      filters.push(lte(auditLog.createdAt, new Date(query.to)));
    }
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: auditLog.id,
          actorId: auditLog.actorId,
          actorName: users.name,
          actorEmail: users.email,
          actorRole: users.role,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          diff: auditLog.diff,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorId, users.id))
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(auditLog).where(where),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actor: row.actorName ?? row.actorEmail ?? "System",
        actorRole: row.actorRole ?? null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        diff: row.diff,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      limit,
      total: Number(totalRow[0]?.total ?? 0),
    };
  }

  async listUsers(
    role?: "Admin" | "Agent" | "Manager" | "EndUser",
  ): Promise<{ data: AdminUserView[] }> {
    const rows = role
      ? await this.db
          .select(USER_PUBLIC_COLS)
          .from(users)
          .where(eq(users.role, role))
          .orderBy(asc(users.name))
      : await this.db
          .select(USER_PUBLIC_COLS)
          .from(users)
          .orderBy(asc(users.name));

    return { data: rows };
  }

  async getUser(userId: string): Promise<AdminUserView> {
    const [row] = await this.db
      .select(USER_PUBLIC_COLS)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException("User not found");
    return row;
  }

  async createUser(dto: CreateUserDto): Promise<AdminUserView> {
    const name = sanitizePlainText(dto.name, 255);
    if (!name) throw new BadRequestException("Name is required");
    const email = dto.email.trim().toLowerCase();
    this.assertPasswordOrThrow(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    let reportsToId: string | null = null;
    if (dto.reportsToId) {
      const manager = await this.loadReportsToTarget(dto.reportsToId);
      // Create has no id yet — empty string cannot equal a UUID reportsToId.
      assertReportsTo(dto.reportsToId, "", manager.role);
      reportsToId = dto.reportsToId;
    }

    try {
      return await this.db.transaction(async (tx) => {
        const referenceCode = await claimReference(tx, "USR");
        const [created] = await tx
          .insert(users)
          .values({
            referenceCode,
            name,
            email,
            passwordHash,
            role: dto.role,
            reportsToId,
          })
          .returning(USER_PUBLIC_COLS);
        return created!;
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException("Email already in use");
      }
      throw err;
    }
  }

  /**
   * Full Admin user patch. Promoting to Manager clears project_members
   * (same rule as updateUserRole).
   */
  async updateUser(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<
    AdminUserView & { previousRole: UserRole; membershipsRemoved: number }
  > {
    if (
      dto.name === undefined &&
      dto.email === undefined &&
      dto.password === undefined &&
      dto.role === undefined &&
      dto.reportsToId === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          reportsToId: users.reportsToId,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!existing) {
        throw new NotFoundException("User not found");
      }

      const patch: {
        name?: string;
        email?: string;
        passwordHash?: string;
        role?: UserRole;
        reportsToId?: string | null;
        updatedAt: Date;
      } = { updatedAt: new Date() };

      if (dto.name !== undefined) {
        const name = sanitizePlainText(dto.name, 255);
        if (!name) throw new BadRequestException("Name is required");
        patch.name = name;
      }
      if (dto.email !== undefined) {
        patch.email = dto.email.trim().toLowerCase();
      }
      if (dto.password !== undefined) {
        this.assertPasswordOrThrow(dto.password);
        patch.passwordHash = await bcrypt.hash(dto.password, 12);
      }
      if (dto.role !== undefined) {
        patch.role = dto.role;
      }
      if (dto.reportsToId !== undefined) {
        if (dto.reportsToId === null) {
          patch.reportsToId = null;
        } else {
          const [manager] = await tx
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.id, dto.reportsToId))
            .limit(1);
          if (!manager) {
            throw new BadRequestException("reportsToId user not found");
          }
          assertReportsTo(dto.reportsToId, userId, manager.role);
          patch.reportsToId = dto.reportsToId;
        }
      }

      let updated: AdminUserView;
      try {
        const [row] = await tx
          .update(users)
          .set(patch)
          .where(eq(users.id, userId))
          .returning(USER_PUBLIC_COLS);
        updated = row!;
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException("Email already in use");
        }
        throw err;
      }

      let membershipsRemoved = 0;
      if (dto.role === "Manager") {
        const removed = await tx
          .delete(projectMembers)
          .where(eq(projectMembers.userId, userId))
          .returning({ projectId: projectMembers.projectId });
        membershipsRemoved = removed.length;
      }

      return {
        ...updated,
        previousRole: existing.role,
        membershipsRemoved,
      };
    });
  }

  private async loadReportsToTarget(reportsToId: string) {
    const [manager] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, reportsToId))
      .limit(1);
    if (!manager) {
      throw new BadRequestException("reportsToId user not found");
    }
    return manager;
  }

  private assertPasswordOrThrow(password: string): void {
    try {
      assertPasswordComplexity(password);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "Invalid password",
      );
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    );
  }

  /**
   * Thin role-only write kept for existing clients.
   * Prefer PATCH /admin/users/:id with a `role` body field.
   */
  async updateUserRole(userId: string, role: UserRole) {
    return this.updateUser(userId, { role });
  }

  /**
   * Admin SLA table editor — matches web `SlaRule` contract
   * (`id`, `priority`, `responseMinutes`, `resolveMinutes`, `createdAt` ISO).
   */
  async listSlaRules() {
    const rows = await this.db
      .select({
        id: slaRules.id,
        priority: slaRules.priority,
        responseMinutes: slaRules.responseMinutes,
        resolveMinutes: slaRules.resolveMinutes,
        createdAt: slaRules.createdAt,
      })
      .from(slaRules)
      .orderBy(asc(slaRules.priority));

    return rows.map((row) => ({
      id: row.id,
      priority: row.priority,
      responseMinutes: row.responseMinutes,
      resolveMinutes: row.resolveMinutes,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async updateSlaRule(priority: string, dto: UpdateSlaRuleMinutesDto) {
    if (!SLA_PRIORITIES.includes(priority as SlaPriority)) {
      throw new BadRequestException(
        `priority must be one of ${SLA_PRIORITIES.join(", ")}`,
      );
    }
    const p = priority as Priority;

    const [existing] = await this.db
      .select({ id: slaRules.id })
      .from(slaRules)
      .where(eq(slaRules.priority, p))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`SLA rule not found for priority ${p}`);
    }

    const [row] = await this.db
      .update(slaRules)
      .set({
        responseMinutes: dto.responseMinutes,
        resolveMinutes: dto.resolveMinutes,
      })
      .where(eq(slaRules.priority, p))
      .returning({
        id: slaRules.id,
        priority: slaRules.priority,
        responseMinutes: slaRules.responseMinutes,
        resolveMinutes: slaRules.resolveMinutes,
        createdAt: slaRules.createdAt,
      });

    return {
      id: row.id,
      priority: row.priority,
      responseMinutes: row.responseMinutes,
      resolveMinutes: row.resolveMinutes,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listEscalationRules() {
    const rows = await this.db
      .select({
        priority: escalationRules.priority,
        notifyManager: escalationRules.notifyManager,
        notifyAdmin: escalationRules.notifyAdmin,
      })
      .from(escalationRules)
      .orderBy(asc(escalationRules.priority));
    return rows;
  }

  async updateEscalationRule(
    priority: string,
    dto: UpdateEscalationRuleDto,
  ) {
    if (!ESCALATION_PRIORITIES.includes(priority as EscalationPriority)) {
      throw new BadRequestException(
        `priority must be one of ${ESCALATION_PRIORITIES.join(", ")}`,
      );
    }
    const p = priority as Priority;
    const [existing] = await this.db
      .select({ priority: escalationRules.priority })
      .from(escalationRules)
      .where(eq(escalationRules.priority, p))
      .limit(1);
    if (!existing) {
      throw new NotFoundException(`Escalation rule not found for ${p}`);
    }
    const [row] = await this.db
      .update(escalationRules)
      .set({
        notifyManager: dto.notifyManager,
        notifyAdmin: dto.notifyAdmin,
      })
      .where(eq(escalationRules.priority, p))
      .returning({
        priority: escalationRules.priority,
        notifyManager: escalationRules.notifyManager,
        notifyAdmin: escalationRules.notifyAdmin,
      });
    return row!;
  }

  /**
   * Phase 9 desk report — Admin scope All, or Manager scope Team (direct reports).
   */
  async buildDeskReport(opts: {
    range: DeskReportRange;
    scope: "All" | "Team";
    managerId?: string;
  }): Promise<DeskReport> {
    const { range, from, to } = resolveChartRange(opts.range);
    const teamFilter =
      opts.scope === "Team" && opts.managerId
        ? eq(users.reportsToId, opts.managerId)
        : null;

    const incidentBase = this.db
      .select({
        status: incidents.status,
        priority: incidents.priority,
        category: incidents.category,
        slaBreached: incidents.slaBreached,
        resolvedAt: incidents.resolvedAt,
      })
      .from(incidents);

    const incidentRows =
      teamFilter != null
        ? await incidentBase
            .innerJoin(users, eq(incidents.assignedTo, users.id))
            .where(
              and(
                gte(incidents.createdAt, from),
                lte(incidents.createdAt, to),
                teamFilter,
              ),
            )
        : await incidentBase.where(
            and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)),
          );

    const srBase = this.db
      .select({
        status: serviceRequests.status,
      })
      .from(serviceRequests);

    const srRows =
      teamFilter != null
        ? await srBase
            .innerJoin(users, eq(serviceRequests.requesterId, users.id))
            .where(
              and(
                gte(serviceRequests.createdAt, from),
                lte(serviceRequests.createdAt, to),
                teamFilter,
              ),
            )
        : await srBase.where(
            and(
              gte(serviceRequests.createdAt, from),
              lte(serviceRequests.createdAt, to),
            ),
          );

    const openIncidentStatuses = new Set(["New", "Assigned", "InProgress"]);
    const openSrStatuses = new Set([
      "Submitted",
      "PendingApproval",
      "Approved",
      "InFulfillment",
    ]);

    let incidentsOpen = 0;
    let incidentsResolved = 0;
    let slaMet = 0;
    let slaBreached = 0;
    const byStatus = new Map<string, number>();
    const byPriority = new Map<string, number>();
    const byCategory = new Map<string, number>();

    for (const row of incidentRows) {
      byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
      byPriority.set(row.priority, (byPriority.get(row.priority) ?? 0) + 1);
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
      if (openIncidentStatuses.has(row.status)) incidentsOpen += 1;
      if (row.status === "Resolved" || row.resolvedAt) incidentsResolved += 1;
      if (row.slaBreached) slaBreached += 1;
      else if (row.resolvedAt) slaMet += 1;
    }

    let serviceRequestsOpen = 0;
    let serviceRequestsApproved = 0;
    for (const row of srRows) {
      if (openSrStatuses.has(row.status)) serviceRequestsOpen += 1;
      if (
        row.status === "Approved" ||
        row.status === "InFulfillment" ||
        row.status === "Fulfilled"
      ) {
        serviceRequestsApproved += 1;
      }
    }

    return {
      title: "Desk report",
      generatedAt: new Date().toISOString(),
      range,
      scope: opts.scope,
      kpis: {
        incidentsOpen,
        incidentsResolved,
        serviceRequestsOpen,
        serviceRequestsApproved,
      },
      byStatus: [...byStatus.entries()].map(([status, count]) => ({
        status,
        count,
      })),
      byPriority: [...byPriority.entries()].map(([priority, count]) => ({
        priority,
        count,
      })),
      byCategory: [...byCategory.entries()].map(([category, count]) => ({
        category,
        count,
      })),
      sla: {
        met: slaMet,
        breached: slaBreached,
        rate: computeSlaComplianceRate(slaMet, slaBreached),
      },
    };
  }

  async deskReportResponse(
    range: DeskReportRange,
    format: "json" | "csv" | "excel",
    scope: "All" | "Team",
    managerId?: string,
  ): Promise<{
    body: DeskReport | string | Buffer;
    filename?: string;
    contentType?: string;
  }> {
    const report = await this.buildDeskReport({ range, scope, managerId });
    const { from, to } = resolveChartRange(range);
    if (format === "csv") {
      return {
        body: buildDeskExportCsv(report),
        filename: exportFilename({
          report: "desk",
          scope,
          from,
          to,
          ext: "csv",
        }),
        contentType: "text/csv; charset=utf-8",
      };
    }
    if (format === "excel") {
      const xlsx = await buildDeskExportXlsx(report, { from, to });
      return {
        body: xlsx.body,
        filename: xlsx.filename,
        contentType: xlsx.contentType,
      };
    }
    return { body: report };
  }

  /**
   * Individual person dossier for an Admin-picked portal user.
   * Profile + tickets they reported + requests + changes they created + audit
   * actor rows in range, and assets they currently hold (not date-filtered).
   * No "assigned to" tickets — assignees are Agents, not the report subject.
   */
  async userActivityReport(query: UserActivityQueryDto) {
    const range = query.range ?? "30d";
    let window: ReturnType<typeof resolveActivityRange>;
    try {
      window = resolveActivityRange(range, query.from, query.to);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "Invalid date range",
      );
    }

    const [profile] = await this.db
      .select({
        id: users.id,
        referenceCode: users.referenceCode,
        name: users.name,
        email: users.email,
        role: users.role,
        reportsToId: users.reportsToId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, query.userId))
      .limit(1);
    if (!profile) throw new NotFoundException("User not found");

    let reportsToName: string | null = null;
    let reportsToEmail: string | null = null;
    if (profile.reportsToId) {
      const [manager] = await this.db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, profile.reportsToId))
        .limit(1);
      reportsToName = manager?.name ?? null;
      reportsToEmail = manager?.email ?? null;
    }

    const { from, to } = window;
    // ponytail: hard cap; page/export if Admins need more than a screenful
    const ROW_CAP = 100;

    const [ticketsReported, requests, changeRows, logs, heldAssets] =
      await Promise.all([
        this.db
          .select({
            id: incidents.id,
            referenceCode: incidents.referenceCode,
            title: incidents.title,
            status: incidents.status,
            priority: incidents.priority,
            category: incidents.category,
            subcategory: incidents.subcategory,
            impact: incidents.impact,
            urgency: incidents.urgency,
            slaBreached: incidents.slaBreached,
            createdAt: incidents.createdAt,
            updatedAt: incidents.updatedAt,
            resolvedAt: incidents.resolvedAt,
          })
          .from(incidents)
          .where(
            and(
              eq(incidents.reporterId, profile.id),
              gte(incidents.createdAt, from),
              lte(incidents.createdAt, to),
            ),
          )
          .orderBy(desc(incidents.createdAt))
          .limit(ROW_CAP),
        this.db
          .select({
            id: serviceRequests.id,
            referenceCode: serviceRequests.referenceCode,
            title: serviceRequests.title,
            status: serviceRequests.status,
            urgency: serviceRequests.urgency,
            createdAt: serviceRequests.createdAt,
            updatedAt: serviceRequests.updatedAt,
            approvedAt: serviceRequests.approvedAt,
            fulfilledAt: serviceRequests.fulfilledAt,
          })
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.requesterId, profile.id),
              gte(serviceRequests.createdAt, from),
              lte(serviceRequests.createdAt, to),
            ),
          )
          .orderBy(desc(serviceRequests.createdAt))
          .limit(ROW_CAP),
        this.db
          .select({
            id: changes.id,
            referenceCode: changes.referenceCode,
            title: changes.title,
            status: changes.status,
            type: changes.type,
            scheduledStart: changes.scheduledStart,
            scheduledEnd: changes.scheduledEnd,
            createdAt: changes.createdAt,
            updatedAt: changes.updatedAt,
            approvedAt: changes.approvedAt,
          })
          .from(changes)
          .where(
            and(
              eq(changes.createdBy, profile.id),
              gte(changes.createdAt, from),
              lte(changes.createdAt, to),
            ),
          )
          .orderBy(desc(changes.createdAt))
          .limit(ROW_CAP),
        this.db
          .select({
            id: auditLog.id,
            action: auditLog.action,
            entityType: auditLog.entityType,
            entityId: auditLog.entityId,
            createdAt: auditLog.createdAt,
          })
          .from(auditLog)
          .where(
            and(
              eq(auditLog.actorId, profile.id),
              gte(auditLog.createdAt, from),
              lte(auditLog.createdAt, to),
            ),
          )
          .orderBy(desc(auditLog.createdAt))
          .limit(ROW_CAP),
        this.db
          .select({
            id: assets.id,
            referenceCode: assets.referenceCode,
            assetTag: assets.assetTag,
            name: assets.name,
            type: assets.type,
            status: assets.status,
            location: assets.location,
            serialNumber: assets.serialNumber,
            purchaseCost: assets.purchaseCost,
            assignedAt: assets.assignedAt,
          })
          .from(assets)
          .where(eq(assets.ownerId, profile.id))
          .orderBy(desc(assets.assignedAt), desc(assets.createdAt))
          .limit(ROW_CAP),
      ]);

    const iso = (d: Date | null | undefined) =>
      d ? d.toISOString() : null;

    return {
      user: {
        id: profile.id,
        referenceCode: profile.referenceCode,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        reportsToId: profile.reportsToId,
        reportsToName,
        reportsToEmail,
        createdAt: iso(profile.createdAt)!,
      },
      range: window.range,
      from: iso(from)!,
      to: iso(to)!,
      ticketsReported: ticketsReported.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        title: r.title,
        status: r.status,
        priority: r.priority,
        category: r.category,
        subcategory: r.subcategory,
        impact: r.impact,
        urgency: r.urgency,
        slaBreached: r.slaBreached,
        createdAt: iso(r.createdAt)!,
        updatedAt: iso(r.updatedAt)!,
        resolvedAt: iso(r.resolvedAt),
      })),
      requests: requests.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        title: r.title,
        status: r.status,
        urgency: r.urgency,
        createdAt: iso(r.createdAt)!,
        updatedAt: iso(r.updatedAt)!,
        approvedAt: iso(r.approvedAt),
        fulfilledAt: iso(r.fulfilledAt),
      })),
      changes: changeRows.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        title: r.title,
        status: r.status,
        type: r.type,
        scheduledStart: iso(r.scheduledStart),
        scheduledEnd: iso(r.scheduledEnd),
        createdAt: iso(r.createdAt)!,
        updatedAt: iso(r.updatedAt)!,
        approvedAt: iso(r.approvedAt),
      })),
      logs: logs.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        createdAt: iso(r.createdAt)!,
      })),
      // Current holdings — not limited to the activity date window.
      assets: heldAssets.map((r) => ({
        id: r.id,
        referenceCode: r.referenceCode,
        assetTag: r.assetTag,
        name: r.name,
        type: r.type,
        status: r.status,
        location: r.location ?? null,
        serialNumber: r.serialNumber ?? null,
        purchaseCost: r.purchaseCost ?? null,
        assignedAt: iso(r.assignedAt),
      })),
      counts: {
        ticketsReported: ticketsReported.length,
        requests: requests.length,
        changes: changeRows.length,
        logs: logs.length,
        assets: heldAssets.length,
      },
    };
  }

  async queueHealth() {
    const queues = [
      { name: SLA_QUEUE, queue: this.slaQueue },
      { name: TICKET_LIFECYCLE_QUEUE, queue: this.lifecycleQueue },
      { name: EMAIL_QUEUE, queue: this.emailQueue },
    ] as const;

    const results = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const counts = await queue.getJobCounts(
            "active",
            "waiting",
            "completed",
            "failed",
            "delayed",
          );
          const paused = await queue.isPaused();
          const failed = counts.failed ?? 0;
          const stalled = await this.countStalledFailures(queue);
          const lastFailure = await this.newestFailedJob(queue);
          const alert = failed > 0 || paused || stalled > 0;
          return {
            name,
            title: QUEUE_TITLE[name] ?? name,
            purpose: QUEUE_PURPOSE[name] ?? "",
            counts: {
              active: counts.active ?? 0,
              waiting: counts.waiting ?? 0,
              completed: counts.completed ?? 0,
              failed,
              delayed: counts.delayed ?? 0,
              paused: 0,
              stalled,
            },
            paused,
            alert,
            lastFailure,
            error: null as string | null,
          };
        } catch (err) {
          return {
            name,
            title: QUEUE_TITLE[name] ?? name,
            purpose: QUEUE_PURPOSE[name] ?? "",
            counts: {
              active: 0,
              waiting: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: 0,
              stalled: 0,
            },
            paused: false,
            alert: true,
            lastFailure: null,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    return {
      queues: results,
      alert: results.some((q) => q.alert),
    };
  }

  /** Count recent failed jobs whose reason indicates a stall (BullMQ has no stalled JobType). */
  private async countStalledFailures(queue: Queue): Promise<number> {
    try {
      const failedJobs = await queue.getJobs(["failed"], 0, 100, true);
      return failedJobs.filter((job) =>
        /stalled/i.test(job.failedReason ?? ""),
      ).length;
    } catch {
      return 0;
    }
  }

  private async newestFailedJob(
    queue: Queue,
  ): Promise<{ jobName: string; reason: string; failedAt: string } | null> {
    try {
      const failedJobs = await queue.getJobs(["failed"], 0, 0, false);
      const job = failedJobs[0];
      if (!job) return null;
      const failedAtMs = job.finishedOn ?? job.timestamp ?? Date.now();
      return {
        jobName: job.name,
        reason: job.failedReason ?? "unknown",
        failedAt: new Date(failedAtMs).toISOString(),
      };
    } catch {
      return null;
    }
  }
}

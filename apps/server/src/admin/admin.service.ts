import { Inject, Injectable } from "@nestjs/common";
import { count, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { changes, incidents, serviceRequests } from "../database/schema";

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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
          delta: "Incidents + requests",
          trend: openTickets > 0 ? ("up" as const) : ("flat" as const),
        },
        {
          id: "p1",
          label: "P1 incidents",
          value: String(p1),
          delta: "Current P1 count",
          trend: p1 > 0 ? ("up" as const) : ("flat" as const),
        },
        {
          id: "sla",
          label: "SLA compliance",
          value: `${slaCompliance}%`,
          delta: slaTotal === 0 ? "No resolved SLA samples" : `${slaMet}/${slaTotal} met`,
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
}

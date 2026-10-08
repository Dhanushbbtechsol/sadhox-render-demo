import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import {
  computeSlaComplianceRate,
  resolveChartRange,
  stackOpenClosed,
  type ChartRangePreset,
} from "./chart-range";
import { assertPasswordComplexity } from "../common/password-policy";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type { UserRole } from "../common/types/roles";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  auditLog,
  changes,
  incidents,
  projectMembers,
  serviceRequests,
  slaRules,
  users,
  type Priority,
} from "../database/schema";
import type { ListAuditLogsQueryDto } from "./dto/list-audit-logs-query.dto";
import {
  SLA_PRIORITIES,
  type SlaPriority,
  type UpdateSlaRuleMinutesDto,
} from "./dto/sla-rule.dto";
import {
  EMAIL_QUEUE,
  SLA_QUEUE,
  TICKET_LIFECYCLE_QUEUE,
} from "../queues/queue.constants";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(SLA_QUEUE) private readonly slaQueue: Queue,
    @InjectQueue(TICKET_LIFECYCLE_QUEUE) private readonly lifecycleQueue: Queue,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

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
        module: "Incident",
        ...stackOpenClosed(
          Number(incidentAgg?.open ?? 0),
          Number(incidentAgg?.closed ?? 0),
        ),
      },
      {
        module: "Service Request",
        ...stackOpenClosed(Number(srAgg?.open ?? 0), Number(srAgg?.closed ?? 0)),
      },
      {
        module: "Change",
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
        module: "Incident",
        label: r.status,
        count: Number(r.count),
      })),
      ...requestRows.map((r) => ({
        status: `ServiceRequest:${r.status}`,
        module: "Service Request",
        label: r.status,
        count: Number(r.count),
      })),
      ...changeRows.map((r) => ({
        status: `Change:${r.status}`,
        module: "Change",
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

  async listUsers(role?: "Admin" | "Agent" | "Manager" | "EndUser") {
    const rows = role
      ? await this.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          })
          .from(users)
          .where(eq(users.role, role))
          .orderBy(asc(users.name))
      : await this.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          })
          .from(users)
          .orderBy(asc(users.name));

    return { data: rows };
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
          const alert = failed > 0 || paused || stalled > 0;
          return {
            name,
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
            error: null as string | null,
          };
        } catch (err) {
          return {
            name,
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

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    const name = this.requireName(input.name);
    const email = this.normalizeEmail(input.email);
    this.assertPassword(input.password);
    await this.assertEmailAvailable(email);

    const passwordHash = await bcrypt.hash(input.password, 12);
    const [row] = await this.db
      .insert(users)
      .values({ name, email, passwordHash, role: input.role })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });
    return row;
  }

  async getUser(userId: string) {
    const [row] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException("User not found");
    return row;
  }

  async updateUser(
    userId: string,
    input: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    },
  ) {
    if (
      input.name === undefined &&
      input.email === undefined &&
      input.password === undefined &&
      input.role === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const name =
      input.name !== undefined ? this.requireName(input.name) : undefined;
    const email =
      input.email !== undefined ? this.normalizeEmail(input.email) : undefined;
    if (input.password !== undefined) this.assertPassword(input.password);
    if (email !== undefined) await this.assertEmailAvailable(email, userId);

    const passwordHash =
      input.password !== undefined
        ? await bcrypt.hash(input.password, 12)
        : undefined;

    const written = await this.persistUser(userId, {
      name,
      email,
      passwordHash,
      role: input.role,
    });
    return {
      id: written.id,
      name: written.name,
      email: written.email,
      role: written.role,
    };
  }

  /**
   * Admin role update. Promoting to Manager clears project_members for that
   * user in the same transaction (Managers supervise; must not remain workers).
   */
  async updateUserRole(userId: string, role: UserRole) {
    return this.persistUser(userId, { role });
  }

  private requireName(name: string): string {
    const cleaned = sanitizePlainText(name, 255);
    if (!cleaned) throw new BadRequestException("Name is required");
    return cleaned;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertPassword(password: string): void {
    try {
      assertPasswordComplexity(password);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : "Invalid password",
      );
    }
  }

  private async assertEmailAvailable(email: string, exceptUserId?: string) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (row && row.id !== exceptUserId) {
      throw new ConflictException("Email already in use");
    }
  }

  private async persistUser(
    userId: string,
    patch: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: UserRole;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!existing) {
        throw new NotFoundException("User not found");
      }

      const [updated] = await tx
        .update(users)
        .set({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.passwordHash !== undefined
            ? { passwordHash: patch.passwordHash }
            : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      let membershipsRemoved = 0;
      if (patch.role === "Manager") {
        const removed = await tx
          .delete(projectMembers)
          .where(eq(projectMembers.userId, userId))
          .returning({ projectId: projectMembers.projectId });
        membershipsRemoved = removed.length;
      }

      return {
        ...updated!,
        previousRole: existing.role,
        membershipsRemoved,
      };
    });
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
}

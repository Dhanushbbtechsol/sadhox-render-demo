import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  computeSlaComplianceRate,
  resolveChartRange,
  stackOpenClosed,
  type ChartRangePreset,
} from "../admin/chart-range";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  changes,
  incidents,
  modules,
  projectMembers,
  projects,
  serviceRequests,
  users,
} from "../database/schema";
import { ProjectAccessService } from "./project-access.service";
import type {
  AddProjectMemberDto,
  CreateModuleDto,
  CreateProjectDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from "./dto/projects.dto";

function mapProject(row: typeof projects.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    managerId: row.managerId,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly access: ProjectAccessService,
  ) {}

  async list(user: AuthUser) {
    const scope = await this.access.listAccessibleProjectIds(user);
    if (scope !== "all" && scope.length === 0) {
      return { data: [] as ReturnType<typeof mapProject>[] };
    }

    const rows =
      scope === "all"
        ? await this.db.select().from(projects).orderBy(asc(projects.name))
        : await this.db
            .select()
            .from(projects)
            .where(inArray(projects.id, scope))
            .orderBy(asc(projects.name));

    return { data: rows.map(mapProject) };
  }

  async get(user: AuthUser, id: string) {
    await this.assertCanRead(user, id);
    const [row] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
    return mapProject(row);
  }

  async create(dto: CreateProjectDto) {
    const name = sanitizePlainText(dto.name);
    if (!name) throw new BadRequestException("Name is required");

    if (dto.managerId) {
      await this.assertUserRole(dto.managerId, "Manager");
    }

    const [row] = await this.db
      .insert(projects)
      .values({
        name,
        managerId: dto.managerId ?? null,
      })
      .returning();
    return mapProject(row!);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const [existing] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Project not found");

    const patch: Partial<typeof projects.$inferInsert> = {};
    if (dto.name !== undefined) {
      const name = sanitizePlainText(dto.name);
      if (!name) throw new BadRequestException("Name is required");
      patch.name = name;
    }
    if (dto.managerId !== undefined) {
      if (dto.managerId) {
        await this.assertUserRole(dto.managerId, "Manager");
      }
      patch.managerId = dto.managerId;
    }

    const [row] = await this.db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, id))
      .returning();
    return mapProject(row!);
  }

  async remove(id: string) {
    const [existing] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Project not found");
    await this.db.delete(projects).where(eq(projects.id, id));
    return { id };
  }

  async listMembers(user: AuthUser, projectId: string) {
    await this.assertCanRead(user, projectId);
    const rows = await this.db
      .select({
        userId: projectMembers.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: projectMembers.createdAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(users.name));

    return {
      data: rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        email: r.email,
        role: r.role,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    await this.assertProjectExists(projectId);
    const member = await this.assertUserRole(dto.userId, "Agent");
    if (member.role !== "Agent") {
      throw new BadRequestException("Only Agents can be project members");
    }

    await this.db
      .insert(projectMembers)
      .values({ projectId, userId: dto.userId })
      .onConflictDoNothing();

    return {
      userId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: new Date().toISOString(),
    };
  }

  async removeMember(projectId: string, userId: string) {
    await this.assertProjectExists(projectId);
    await this.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      );
    return { projectId, userId };
  }

  async listModules(user: AuthUser, projectId: string) {
    await this.assertCanRead(user, projectId);
    const rows = await this.db
      .select()
      .from(modules)
      .where(eq(modules.projectId, projectId))
      .orderBy(asc(modules.name));
    return {
      data: rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        name: r.name,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async createModule(projectId: string, dto: CreateModuleDto) {
    await this.assertProjectExists(projectId);
    const name = sanitizePlainText(dto.name);
    if (!name) throw new BadRequestException("Name is required");

    try {
      const [row] = await this.db
        .insert(modules)
        .values({ projectId, name })
        .returning();
      return {
        id: row!.id,
        projectId: row!.projectId,
        name: row!.name,
        createdAt: row!.createdAt.toISOString(),
      };
    } catch {
      throw new BadRequestException("Module name already exists on this project");
    }
  }

  async updateModule(projectId: string, moduleId: string, dto: UpdateModuleDto) {
    await this.assertProjectExists(projectId);
    const name = sanitizePlainText(dto.name);
    if (!name) throw new BadRequestException("Name is required");

    const [existing] = await this.db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .limit(1);
    if (!existing) throw new NotFoundException("Module not found");

    try {
      const [row] = await this.db
        .update(modules)
        .set({ name })
        .where(eq(modules.id, moduleId))
        .returning();
      return {
        id: row!.id,
        projectId: row!.projectId,
        name: row!.name,
        createdAt: row!.createdAt.toISOString(),
      };
    } catch {
      throw new BadRequestException("Module name already exists on this project");
    }
  }

  async removeModule(projectId: string, moduleId: string) {
    const [existing] = await this.db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .limit(1);
    if (!existing) throw new NotFoundException("Module not found");
    await this.db.delete(modules).where(eq(modules.id, moduleId));
    return { id: moduleId };
  }

  /** Manager home KPIs scoped to owned projects. */
  async managerDashboardStats(user: AuthUser) {
    if (user.role !== "Manager" && user.role !== "Admin") {
      throw new ForbiddenException();
    }

    const owned =
      user.role === "Admin"
        ? await this.db.select({ id: projects.id }).from(projects)
        : await this.db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.managerId, user.userId));

    const projectIds = owned.map((p) => p.id);
    const projectCount = projectIds.length;

    if (projectIds.length === 0) {
      return {
        kpis: [
          {
            id: "projects",
            label: "Owned projects",
            value: "0",
            delta: "No projects assigned",
            trend: "flat" as const,
          },
          {
            id: "total",
            label: "Total tickets",
            value: "0",
            delta: "In owned projects",
            trend: "flat" as const,
          },
          {
            id: "open",
            label: "Open tickets",
            value: "0",
            delta: "Incidents + requests",
            trend: "flat" as const,
          },
          {
            id: "p1",
            label: "P1 incidents",
            value: "0",
            delta: "Current P1 count",
            trend: "flat" as const,
          },
        ],
        projectIds: [] as string[],
      };
    }

    const [incidentAgg] = await this.db
      .select({
        total: count(),
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        p1: sql<number>`count(*) filter (where ${incidents.priority} = 'P1')`,
      })
      .from(incidents)
      .where(inArray(incidents.projectId, projectIds));

    const [srAgg] = await this.db
      .select({
        total: count(),
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected','Draft'))`,
      })
      .from(serviceRequests)
      .where(inArray(serviceRequests.projectId, projectIds));

    const [changeAgg] = await this.db
      .select({ total: count() })
      .from(changes)
      .where(inArray(changes.projectId, projectIds));

    const totalTickets =
      Number(incidentAgg?.total ?? 0) +
      Number(srAgg?.total ?? 0) +
      Number(changeAgg?.total ?? 0);
    const openTickets =
      Number(incidentAgg?.open ?? 0) + Number(srAgg?.open ?? 0);
    const p1 = Number(incidentAgg?.p1 ?? 0);

    return {
      kpis: [
        {
          id: "projects",
          label: "Owned projects",
          value: String(projectCount),
          delta: "Assigned to you",
          trend: "flat" as const,
        },
        {
          id: "total",
          label: "Total tickets",
          value: String(totalTickets),
          delta: "In owned projects",
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
      ],
      projectIds,
    };
  }

  /**
   * Chart payloads for projects the caller owns. Scope is resolved on the
   * server from `projects.manager_id` (Admin: all). Clients must not filter
   * a global dashboard payload.
   */
  async managerCharts(user: AuthUser, rangePreset: ChartRangePreset = "30d") {
    if (user.role !== "Manager" && user.role !== "Admin") {
      throw new ForbiddenException();
    }

    const { range, from, to } = resolveChartRange(rangePreset);
    const owned =
      user.role === "Admin"
        ? await this.db.select({ id: projects.id }).from(projects)
        : await this.db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.managerId, user.userId));
    const projectIds = owned.map((p) => p.id);

    const emptyVolume = [
      { module: "Incident", ...stackOpenClosed(0, 0) },
      { module: "Service Request", ...stackOpenClosed(0, 0) },
      { module: "Change", ...stackOpenClosed(0, 0) },
    ];

    if (projectIds.length === 0) {
      return {
        range,
        from: from.toISOString(),
        to: to.toISOString(),
        projectIds,
        volume: emptyVolume,
        sla: { met: 0, breached: 0, rate: computeSlaComplianceRate(0, 0) },
      };
    }

    const projectScope = inArray(incidents.projectId, projectIds);
    const [incidentAgg] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${incidents.status} in ('New','Assigned','InProgress'))`,
        closed: sql<number>`count(*) filter (where ${incidents.status} in ('Resolved','Closed'))`,
      })
      .from(incidents)
      .where(
        and(projectScope, gte(incidents.createdAt, from), lte(incidents.createdAt, to)),
      );

    const [srAgg] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} not in ('Fulfilled','Closed','Rejected'))`,
        closed: sql<number>`count(*) filter (where ${serviceRequests.status} in ('Fulfilled','Closed','Rejected'))`,
      })
      .from(serviceRequests)
      .where(
        and(
          inArray(serviceRequests.projectId, projectIds),
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
      .where(
        and(
          inArray(changes.projectId, projectIds),
          gte(changes.createdAt, from),
          lte(changes.createdAt, to),
        ),
      );

    const [slaAgg] = await this.db
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
          projectScope,
          sql`${incidents.resolvedAt} is not null`,
          gte(incidents.resolvedAt, from),
          lte(incidents.resolvedAt, to),
        ),
      );

    const met = Number(slaAgg?.met ?? 0);
    const breached = Number(slaAgg?.breached ?? 0);

    return {
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      projectIds,
      volume: [
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
      ],
      sla: { met, breached, rate: computeSlaComplianceRate(met, breached) },
    };
  }

  private async assertCanRead(user: AuthUser, projectId: string) {
    const ok = await this.access.canAccess(user, projectId);
    if (!ok) {
      // Same status for missing and unauthorized so a Manager cannot probe other project ids.
      throw new NotFoundException("Project not found");
    }
  }

  private async assertProjectExists(projectId: string) {
    const [row] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
  }

  private async assertUserRole(userId: string, expected: "Manager" | "Agent") {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new BadRequestException("User not found");
    if (user.role !== expected) {
      throw new BadRequestException(
        expected === "Manager"
          ? "managerId must reference a Manager user"
          : "Only Agents can be project members",
      );
    }
    return user;
  }
}

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

export type ProjectView = {
  id: string;
  name: string;
  managerId: string;
  managerName: string | null;
  createdAt: string;
};

/** EndUser picker — no manager identities. */
export type ProjectPickerView = {
  id: string;
  name: string;
};

export type ModuleView = {
  id: string;
  projectId: string;
  name: string;
};

export type MemberView = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly access: ProjectAccessService,
  ) {}

  async list(
    user: AuthUser,
  ): Promise<{ data: ProjectView[] | ProjectPickerView[] }> {
    // EndUser: all projects as picker DTO only (id + name — no manager leak).
    if (user.role === "EndUser") {
      const rows = await this.db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .orderBy(asc(projects.name));
      return { data: rows };
    }

    // Admin: all full rows. Manager/Agent: accessible only.
    const ids =
      user.role === "Admin"
        ? null
        : await this.access.listAccessibleProjectIds(user);
    const scope =
      ids === null
        ? undefined
        : ids.length === 0
          ? sql`false`
          : inArray(projects.id, ids);

    const rows = await this.db
      .select({
        project: projects,
        managerName: users.name,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(scope)
      .orderBy(asc(projects.name));

    return {
      data: rows.map((r) => this.toProjectView(r.project, r.managerName)),
    };
  }

  async get(user: AuthUser, id: string): Promise<ProjectView> {
    await this.assertCanRead(user, id);
    return this.loadProject(id);
  }

  async create(user: AuthUser, dto: CreateProjectDto): Promise<ProjectView> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can create projects");
    }
    const name = sanitizePlainText(dto.name);
    if (!name) throw new BadRequestException("Project name is required");

    await this.assertUserRole(dto.managerId, "Manager");

    const [created] = await this.db
      .insert(projects)
      .values({
        name,
        managerId: dto.managerId,
      })
      .returning();

    return this.loadProject(created!.id);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectView> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can update projects");
    }
    await this.loadProject(id);

    if (dto.managerId) {
      await this.assertUserRole(dto.managerId, "Manager");
    }

    const name =
      dto.name !== undefined ? sanitizePlainText(dto.name) : undefined;
    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Project name is required");
    }

    await this.db
      .update(projects)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
      })
      .where(eq(projects.id, id));

    return this.loadProject(id);
  }

  async remove(id: string): Promise<{ id: string }> {
    const [existing] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Project not found");
    await this.db.delete(projects).where(eq(projects.id, id));
    return { id };
  }

  async listModules(
    user: AuthUser,
    projectId: string,
  ): Promise<{ data: ModuleView[] }> {
    if (user.role === "EndUser") {
      // Attachable projects = all (picker). Existence only; return picker fields.
      const [project] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) throw new NotFoundException("Project not found");
    } else {
      await this.assertCanRead(user, projectId);
    }

    const rows = await this.db
      .select({
        id: modules.id,
        name: modules.name,
        projectId: modules.projectId,
      })
      .from(modules)
      .where(eq(modules.projectId, projectId))
      .orderBy(asc(modules.name));
    return { data: rows };
  }

  async createModule(
    user: AuthUser,
    projectId: string,
    dto: CreateModuleDto,
  ): Promise<ModuleView> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can create modules");
    }
    await this.loadProject(projectId);
    const name = sanitizePlainText(dto.name);
    if (!name) throw new BadRequestException("Module name is required");

    try {
      const [created] = await this.db
        .insert(modules)
        .values({ projectId, name })
        .returning();

      return {
        id: created!.id,
        projectId: created!.projectId,
        name: created!.name,
      };
    } catch {
      throw new BadRequestException(
        "Module name already exists on this project",
      );
    }
  }

  async updateModule(
    projectId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ): Promise<ModuleView> {
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
      };
    } catch {
      throw new BadRequestException(
        "Module name already exists on this project",
      );
    }
  }

  async removeModule(
    projectId: string,
    moduleId: string,
  ): Promise<{ id: string }> {
    const [existing] = await this.db
      .select({ id: modules.id })
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .limit(1);
    if (!existing) throw new NotFoundException("Module not found");
    await this.db.delete(modules).where(eq(modules.id, moduleId));
    return { id: moduleId };
  }

  async listMembers(
    user: AuthUser,
    projectId: string,
  ): Promise<{ data: MemberView[] }> {
    await this.assertCanRead(user, projectId);
    const rows = await this.db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(users.name));
    return { data: rows };
  }

  async addMember(
    user: AuthUser,
    projectId: string,
    dto: AddProjectMemberDto,
  ): Promise<MemberView> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can manage project members");
    }
    await this.loadProject(projectId);
    const member = await this.assertUserRole(dto.userId, "Agent");

    await this.db
      .insert(projectMembers)
      .values({
        projectId,
        userId: dto.userId,
      })
      .onConflictDoNothing();

    return {
      userId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    };
  }

  async removeMember(
    user: AuthUser,
    projectId: string,
    memberUserId: string,
  ): Promise<{ projectId: string; userId: string }> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can manage project members");
    }
    await this.loadProject(projectId);
    await this.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, memberUserId),
        ),
      );
    return { projectId, userId: memberUserId };
  }

  /**
   * Validate project/module pair for ticket writes.
   * - Unscoped (null): Admin or EndUser only — Manager/Agent must stamp a project
   * - project set, module null: OK
   * - module set without project: reject
   * - module must belong to project
   * - actor must canAccess project (unless EndUser creating own ticket)
   */
  async resolveTicketProjectFields(
    user: AuthUser,
    projectId: string | null | undefined,
    moduleId: string | null | undefined,
  ): Promise<{ projectId: string | null; moduleId: string | null }> {
    const pid = projectId === undefined ? undefined : projectId;
    const mid = moduleId === undefined ? undefined : moduleId;

    if (pid === undefined && mid === undefined) {
      this.assertMayStampUnscoped(user);
      return { projectId: null, moduleId: null };
    }

    const resolvedProjectId = pid ?? null;
    const resolvedModuleId = mid ?? null;

    if (resolvedModuleId && !resolvedProjectId) {
      throw new BadRequestException("moduleId requires projectId");
    }

    if (!resolvedProjectId) {
      this.assertMayStampUnscoped(user);
    } else if (user.role !== "EndUser") {
      await this.access.assertCanAccess(user, resolvedProjectId);
    } else {
      // EndUser may attach to any existing project (portal); existence check only.
      const [proj] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, resolvedProjectId))
        .limit(1);
      if (!proj) throw new NotFoundException("Project not found");
    }

    if (resolvedModuleId && resolvedProjectId) {
      const [mod] = await this.db
        .select({ id: modules.id, projectId: modules.projectId })
        .from(modules)
        .where(eq(modules.id, resolvedModuleId))
        .limit(1);
      if (!mod) throw new NotFoundException("Module not found");
      if (mod.projectId !== resolvedProjectId) {
        throw new BadRequestException("Module does not belong to project");
      }
    }

    return {
      projectId: resolvedProjectId,
      moduleId: resolvedModuleId,
    };
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
        and(
          projectScope,
          gte(incidents.createdAt, from),
          lte(incidents.createdAt, to),
        ),
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
          ...stackOpenClosed(
            Number(srAgg?.open ?? 0),
            Number(srAgg?.closed ?? 0),
          ),
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

  /** Unscoped tickets are Admin (global pool) or EndUser (own) only. */
  private assertMayStampUnscoped(user: AuthUser): void {
    if (user.role === "Admin" || user.role === "EndUser") return;
    throw new BadRequestException(
      "Only Admin may create or clear unscoped tickets",
    );
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

  private async loadProject(id: string): Promise<ProjectView> {
    const [row] = await this.db
      .select({
        project: projects,
        managerName: users.name,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(eq(projects.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
    return this.toProjectView(row.project, row.managerName);
  }

  private async assertUserRole(
    userId: string,
    expected: "Manager" | "Agent",
  ) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException("User not found");
    if (row.role !== expected) {
      throw new BadRequestException(
        expected === "Agent"
          ? "Project members must be Agents"
          : "Project manager must have Manager role",
      );
    }
    return row;
  }

  private toProjectView(
    row: typeof projects.$inferSelect,
    managerName: string | null,
  ): ProjectView {
    return {
      id: row.id,
      name: row.name,
      managerId: row.managerId,
      managerName,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

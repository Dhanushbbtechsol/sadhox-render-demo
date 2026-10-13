import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  computeSlaComplianceRate,
  resolveChartRange,
  stackOpenClosed,
  type ChartRangePreset,
} from "../admin/chart-range";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type { AuthUser } from "../common/decorators/current-user.decorator";
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
import { claimReference } from "../incidents/reference";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import type {
  AddProjectMemberDto,
  CreateModuleDto,
  CreateProjectDto,
  SaveProjectSummaryDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scope: ProjectScopeService,
    private readonly access: ProjectAccessService,
  ) {}

  private projectWithManagerSelect() {
    return {
      id: projects.id,
      referenceCode: projects.referenceCode,
      name: projects.name,
      managerId: projects.managerId,
      managerName: users.name,
      createdAt: projects.createdAt,
    } as const;
  }

  async create(dto: CreateProjectDto) {
    await this.assertManagerUser(dto.managerId);
    const name = sanitizePlainText(dto.name, 255);
    if (!name) throw new BadRequestException("Project name is required");
    const row = await this.db.transaction(async (tx) => {
      const referenceCode = await claimReference(tx, "PRJ");
      const [created] = await tx
        .insert(projects)
        .values({ referenceCode, name, managerId: dto.managerId })
        .returning();
      return created!;
    });
    const [manager] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, dto.managerId))
      .limit(1);
    return {
      id: row.id,
      referenceCode: row.referenceCode,
      name: row.name,
      managerId: row.managerId,
      managerName: manager?.name ?? null,
      createdAt: row.createdAt,
    };
  }

  /**
   * Admin: all projects (full).
   * Manager/Agent: accessible projects (full).
   * EndUser: all projects as picker DTO (`id`, `name` only) — no manager identities.
   */
  async list(user: AuthUser) {
    if (user.role === "EndUser") {
      const rows = await this.db
        .select({
          id: projects.id,
          referenceCode: projects.referenceCode,
          name: projects.name,
        })
        .from(projects);
      return rows;
    }
    if (user.role === "Admin") {
      return this.db
        .select(this.projectWithManagerSelect())
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id));
    }
    if (user.role === "Manager" || user.role === "Agent") {
      const ids = await this.access.listAccessibleProjectIds(user);
      if (ids.length === 0) return [];
      return this.db
        .select(this.projectWithManagerSelect())
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(inArray(projects.id, ids));
    }
    throw new ForbiddenException("Insufficient role");
  }

  async getById(user: AuthUser, projectId: string) {
    const [row] = await this.db
      .select(this.projectWithManagerSelect())
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
    if (user.role === "Admin") return row;
    const ok = await this.access.canAccess(user, projectId);
    if (!ok) {
      throw new ForbiddenException("No access to this project");
    }
    return row;
  }

  async update(projectId: string, dto: UpdateProjectDto) {
    await this.requireProject(projectId);
    if (dto.managerId !== undefined) {
      await this.assertManagerUser(dto.managerId);
    }
    if (dto.name === undefined && dto.managerId === undefined) {
      throw new BadRequestException("No fields to update");
    }
    const name =
      dto.name !== undefined ? sanitizePlainText(dto.name, 255) : undefined;
    if (dto.name !== undefined && !name) {
      throw new BadRequestException("Project name is required");
    }
    await this.db
      .update(projects)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
      })
      .where(eq(projects.id, projectId));
    const [row] = await this.db
      .select(this.projectWithManagerSelect())
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);
    return row;
  }

  async remove(projectId: string) {
    const deleted = await this.db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning({ id: projects.id });
    if (deleted.length === 0) {
      throw new NotFoundException("Project not found");
    }
    return { ok: true };
  }

  /**
   * U8 — one save for the project summary dialog. Validates name, manager,
   * the desired member set (KTD6 — Agent only), and the desired module set
   * up front, then persists all four in one transaction (diffed against
   * current state) — a single submit covers name + manager + members +
   * modules together instead of a PATCH plus separate per-item calls.
   */
  async saveSummary(projectId: string, dto: SaveProjectSummaryDto) {
    return this.db.transaction(async (tx) => {
      const [existingProject] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!existingProject) throw new NotFoundException("Project not found");

      const [manager] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, dto.managerId))
        .limit(1);
      if (!manager) throw new NotFoundException("Manager user not found");
      if (manager.role !== "Manager") {
        throw new BadRequestException(
          "managerId must reference a user with role Manager",
        );
      }

      const name = sanitizePlainText(dto.name, 255);
      if (!name) throw new BadRequestException("Project name is required");

      // Members: diff the desired full set (KTD6 — Agent only) against current rows.
      const desiredMemberIds = Array.from(new Set(dto.memberUserIds));
      const existingMembers = await tx
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId));
      const existingMemberIds = new Set(existingMembers.map((m) => m.userId));
      const memberIdsToAdd = desiredMemberIds.filter(
        (id) => !existingMemberIds.has(id),
      );
      const memberIdsToRemove = [...existingMemberIds].filter(
        (id) => !desiredMemberIds.includes(id),
      );

      if (memberIdsToAdd.length > 0) {
        const candidates = await tx
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(inArray(users.id, memberIdsToAdd));
        const candidateById = new Map(candidates.map((u) => [u.id, u]));
        for (const id of memberIdsToAdd) {
          const candidate = candidateById.get(id);
          if (!candidate) throw new NotFoundException("User not found");
          if (candidate.role !== "Agent") {
            throw new BadRequestException(
              "Only Agent users can be added as project members",
            );
          }
        }
      }

      // Modules: desired items with `id` are kept/renamed; without `id` are
      // created; existing modules absent from the desired set are deleted.
      const existingModules = await tx
        .select()
        .from(modules)
        .where(eq(modules.projectId, projectId));
      const existingModuleById = new Map(
        existingModules.map((m) => [m.id, m]),
      );
      const desiredModuleIds = new Set(
        dto.modules.filter((m) => m.id).map((m) => m.id as string),
      );
      const sanitizedModules: { id?: string; name: string }[] = [];
      for (const mod of dto.modules) {
        const moduleName = sanitizePlainText(mod.name, 255);
        if (!moduleName) {
          throw new BadRequestException("Module name is required");
        }
        if (mod.id && !existingModuleById.has(mod.id)) {
          throw new NotFoundException("Module not found");
        }
        sanitizedModules.push({ id: mod.id, name: moduleName });
      }

      // Validation passed — persist name, manager, members, and modules together.
      await tx
        .update(projects)
        .set({ name, managerId: dto.managerId })
        .where(eq(projects.id, projectId));

      if (memberIdsToAdd.length > 0) {
        await tx
          .insert(projectMembers)
          .values(memberIdsToAdd.map((userId) => ({ projectId, userId })));
      }
      if (memberIdsToRemove.length > 0) {
        await tx
          .delete(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              inArray(projectMembers.userId, memberIdsToRemove),
            ),
          );
      }

      for (const mod of sanitizedModules) {
        if (mod.id) {
          const existing = existingModuleById.get(mod.id);
          if (existing && existing.name !== mod.name) {
            await tx
              .update(modules)
              .set({ name: mod.name })
              .where(eq(modules.id, mod.id));
          }
        } else {
          await tx.insert(modules).values({ projectId, name: mod.name });
        }
      }
      const moduleIdsToRemove = existingModules
        .filter((m) => !desiredModuleIds.has(m.id))
        .map((m) => m.id);
      if (moduleIdsToRemove.length > 0) {
        await tx
          .delete(modules)
          .where(
            and(
              eq(modules.projectId, projectId),
              inArray(modules.id, moduleIdsToRemove),
            ),
          );
      }

      const [project] = await tx
        .select(this.projectWithManagerSelect())
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(eq(projects.id, projectId))
        .limit(1);

      const memberRows = await tx
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .where(eq(projectMembers.projectId, projectId));

      const moduleRows = await tx
        .select()
        .from(modules)
        .where(eq(modules.projectId, projectId));

      return { project, members: memberRows, modules: moduleRows };
    });
  }

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    await this.scope.assertProjectExists(projectId);
    // KTD6: project_members are Agent users only. Managers supervise projects
    // via projects.manager_id and are never members.
    const [member] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, dto.userId))
      .limit(1);
    if (!member) throw new NotFoundException("User not found");
    if (member.role !== "Agent") {
      throw new BadRequestException(
        "Only Agent users can be added as project members",
      );
    }

    try {
      const [row] = await this.db
        .insert(projectMembers)
        .values({ projectId, userId: dto.userId })
        .returning();
      return row;
    } catch {
      throw new ConflictException("User is already a member of this project");
    }
  }

  async listMembers(user: AuthUser, projectId: string) {
    await this.getById(user, projectId);
    return this.db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId));
  }

  async removeMember(projectId: string, userId: string) {
    const deleted = await this.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId),
        ),
      )
      .returning({ userId: projectMembers.userId });
    if (deleted.length === 0) {
      throw new NotFoundException("Project member not found");
    }
    return { ok: true };
  }

  async createModule(projectId: string, dto: CreateModuleDto) {
    await this.scope.assertProjectExists(projectId);
    const name = sanitizePlainText(dto.name, 255);
    if (!name) throw new BadRequestException("Module name is required");
    const [row] = await this.db
      .insert(modules)
      .values({ projectId, name })
      .returning();
    return row;
  }

  /**
   * EndUser: project must exist; return picker fields only (`id`, `name`, `projectId`).
   * Others: require project access, return full module rows.
   */
  async listModules(user: AuthUser, projectId: string) {
    if (user.role === "EndUser") {
      await this.requireProject(projectId);
      return this.db
        .select({
          id: modules.id,
          name: modules.name,
          projectId: modules.projectId,
        })
        .from(modules)
        .where(eq(modules.projectId, projectId));
    }
    await this.getById(user, projectId);
    return this.db
      .select()
      .from(modules)
      .where(eq(modules.projectId, projectId));
  }

  async updateModule(
    projectId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ) {
    const name = sanitizePlainText(dto.name, 255);
    if (!name) throw new BadRequestException("Module name is required");
    const [row] = await this.db
      .update(modules)
      .set({ name })
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .returning();
    if (!row) throw new NotFoundException("Module not found");
    return row;
  }

  async removeModule(projectId: string, moduleId: string) {
    const deleted = await this.db
      .delete(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)))
      .returning({ id: modules.id });
    if (deleted.length === 0) {
      throw new NotFoundException("Module not found");
    }
    return { ok: true };
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
            delta: "Tickets + requests",
            trend: "flat" as const,
          },
          {
            id: "p1",
            label: "P1 tickets",
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
      { module: "Ticket", ...stackOpenClosed(0, 0) },
      { module: "Request", ...stackOpenClosed(0, 0) },
      { module: "Change request", ...stackOpenClosed(0, 0) },
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
      ],
      sla: { met, breached, rate: computeSlaComplianceRate(met, breached) },
    };
  }

  private async requireProject(projectId: string) {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }

  private async assertManagerUser(managerId: string) {
    const [user] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);
    if (!user) throw new NotFoundException("Manager user not found");
    if (user.role !== "Manager") {
      throw new BadRequestException(
        "managerId must reference a user with role Manager",
      );
    }
  }

  /**
   * Validate project/module pair for ticket writes.
   * - No project (null): Admin, Agent, or EndUser — Manager must stamp a project
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

  /** No project: Admin/Agent global pool, or EndUser own. Manager must stamp a project. */
  private assertMayStampUnscoped(user: AuthUser): void {
    if (
      user.role === "Admin" ||
      user.role === "EndUser" ||
      user.role === "Agent"
    ) {
      return;
    }
    throw new BadRequestException(
      "Managers must link tickets to a project they own",
    );
  }
}

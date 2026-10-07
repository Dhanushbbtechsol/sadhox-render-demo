import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  modules,
  projectMembers,
  projects,
  users,
} from "../database/schema";
import { ProjectAccessService } from "./project-access.service";
import type {
  AddProjectMemberDto,
  CreateModuleDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "./dto/project.dto";

export type ProjectView = {
  id: string;
  name: string;
  managerId: string;
  managerName: string | null;
  createdAt: string;
};

export type ModuleView = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
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

  async list(user: AuthUser): Promise<ProjectView[]> {
    const ids = await this.access.listAccessibleProjectIds(user);
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

    return rows.map((r) => this.toProjectView(r.project, r.managerName));
  }

  async get(user: AuthUser, id: string): Promise<ProjectView> {
    await this.access.assertCanAccess(user, id);
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

  async listModules(user: AuthUser, projectId: string): Promise<ModuleView[]> {
    await this.access.assertCanAccess(user, projectId);
    const rows = await this.db
      .select()
      .from(modules)
      .where(eq(modules.projectId, projectId))
      .orderBy(asc(modules.name));
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
    }));
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

    const [created] = await this.db
      .insert(modules)
      .values({ projectId, name })
      .returning();

    return {
      id: created!.id,
      projectId: created!.projectId,
      name: created!.name,
      createdAt: created!.createdAt.toISOString(),
    };
  }

  async listMembers(user: AuthUser, projectId: string): Promise<MemberView[]> {
    await this.access.assertCanAccess(user, projectId);
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
    return rows;
  }

  async addMember(
    user: AuthUser,
    projectId: string,
    dto: AddProjectMemberDto,
  ): Promise<MemberView[]> {
    if (user.role !== "Admin") {
      throw new ForbiddenException("Only Admin can manage project members");
    }
    await this.loadProject(projectId);
    await this.assertUserRole(dto.userId, "Agent");

    const [existing] = await this.db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, dto.userId),
        ),
      )
      .limit(1);

    if (!existing) {
      await this.db.insert(projectMembers).values({
        projectId,
        userId: dto.userId,
      });
    }

    return this.listMembers(user, projectId);
  }

  async removeMember(
    user: AuthUser,
    projectId: string,
    memberUserId: string,
  ): Promise<MemberView[]> {
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
    return this.listMembers(user, projectId);
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

  /** Unscoped tickets are Admin (global pool) or EndUser (own) only. */
  private assertMayStampUnscoped(user: AuthUser): void {
    if (user.role === "Admin" || user.role === "EndUser") return;
    throw new BadRequestException(
      "Only Admin may create or clear unscoped tickets",
    );
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
      .select({ id: users.id, role: users.role })
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

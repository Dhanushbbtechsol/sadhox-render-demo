import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { modules, projectMembers, projects, users } from "../database/schema";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import type {
  AddProjectMemberDto,
  CreateModuleDto,
  CreateProjectDto,
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

  async create(dto: CreateProjectDto) {
    await this.assertManagerUser(dto.managerId);
    const name = sanitizePlainText(dto.name, 255);
    if (!name) throw new BadRequestException("Project name is required");
    const [row] = await this.db
      .insert(projects)
      .values({ name, managerId: dto.managerId })
      .returning();
    return row;
  }

  /**
   * Admin: all projects (full).
   * Manager/Agent: accessible projects (full).
   * EndUser: all projects as picker DTO (`id`, `name` only) — no manager identities.
   */
  async list(user: AuthUser) {
    if (user.role === "EndUser") {
      const rows = await this.db
        .select({ id: projects.id, name: projects.name })
        .from(projects);
      return rows;
    }
    if (user.role === "Admin") {
      return this.db.select().from(projects);
    }
    if (user.role === "Manager" || user.role === "Agent") {
      const ids = await this.access.listAccessibleProjectIds(user);
      if (ids.length === 0) return [];
      return this.db.select().from(projects).where(inArray(projects.id, ids));
    }
    throw new ForbiddenException("Insufficient role");
  }

  async getById(user: AuthUser, projectId: string) {
    const row = await this.requireProject(projectId);
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
    const [row] = await this.db
      .update(projects)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
      })
      .where(eq(projects.id, projectId))
      .returning();
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

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    await this.scope.assertProjectExists(projectId);
    // Design authority: service rejects non-Agent inserts; Managers cannot be members.
    await this.scope.assertUserIsAgentForMembership(dto.userId);

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
      })
      .from(projectMembers)
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
}

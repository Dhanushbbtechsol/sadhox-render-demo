import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, eq, inArray } from "drizzle-orm";
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
} from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly access: ProjectAccessService,
  ) {}

  async list(user: AuthUser) {
    // EndUser: all projects for catalog/request pickers (no workspace ACL).
    if (user.role === "EndUser" || user.role === "Admin") {
      const rows = await this.db
        .select({
          id: projects.id,
          name: projects.name,
          managerId: projects.managerId,
          managerName: users.name,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .orderBy(asc(projects.name));
      return {
        data: rows.map((r) => ({
          id: r.id,
          name: r.name,
          managerId: r.managerId,
          managerName: r.managerName ?? "Unknown",
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }

    const ids = await this.access.listAccessibleProjectIds(user);
    if (!ids || ids.length === 0) return { data: [] };

    const rows = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        managerId: projects.managerId,
        managerName: users.name,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(inArray(projects.id, ids))
      .orderBy(asc(projects.name));

    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        managerId: r.managerId,
        managerName: r.managerName ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async create(dto: CreateProjectDto) {
    const [manager] = await this.db
      .select({ id: users.id, role: users.role, name: users.name })
      .from(users)
      .where(eq(users.id, dto.managerId))
      .limit(1);
    if (!manager) throw new NotFoundException("Manager user not found");
    if (manager.role !== "Manager" && manager.role !== "Admin") {
      throw new BadRequestException("managerId must be a Manager (or Admin)");
    }

    const [created] = await this.db
      .insert(projects)
      .values({ name: dto.name.trim(), managerId: dto.managerId })
      .returning();

    return {
      id: created.id,
      name: created.name,
      managerId: created.managerId,
      managerName: manager.name,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listModules(user: AuthUser, projectId: string) {
    if (user.role !== "EndUser" && user.role !== "Admin") {
      await this.access.assertCanAccess(user, projectId);
    } else {
      const [project] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) throw new NotFoundException("Project not found");
    }

    const rows = await this.db
      .select({
        id: modules.id,
        projectId: modules.projectId,
        name: modules.name,
        createdAt: modules.createdAt,
      })
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
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) throw new NotFoundException("Project not found");

    const [created] = await this.db
      .insert(modules)
      .values({ projectId, name: dto.name.trim() })
      .returning();

    return {
      id: created.id,
      projectId: created.projectId,
      name: created.name,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project) throw new NotFoundException("Project not found");

    await this.access.assertAgentMember(dto.userId);

    await this.db
      .insert(projectMembers)
      .values({ projectId, userId: dto.userId })
      .onConflictDoNothing();

    return { ok: true as const };
  }

  async listMembers(user: AuthUser, projectId: string) {
    await this.access.assertCanAccess(user, projectId);
    const rows = await this.db
      .select({
        userId: projectMembers.userId,
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
}

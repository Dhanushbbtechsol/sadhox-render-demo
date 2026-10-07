import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, isNull, or, SQL, sql, type AnyColumn } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { modules, projectMembers, projects, users } from "../database/schema";

@Injectable()
export class ProjectAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async canAccess(user: AuthUser, projectId: string): Promise<boolean> {
    if (user.role === "Admin") return true;

    if (user.role === "Manager") {
      const [row] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.managerId, user.userId)),
        )
        .limit(1);
      return Boolean(row);
    }

    if (user.role === "Agent") {
      const [row] = await this.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, user.userId),
          ),
        )
        .limit(1);
      return Boolean(row);
    }

    // EndUser: no project workspace access (own-ticket rules elsewhere)
    return false;
  }

  async assertCanAccess(user: AuthUser, projectId: string): Promise<void> {
    if (!(await this.canAccess(user, projectId))) {
      throw new ForbiddenException("No access to this project");
    }
  }

  /**
   * Project IDs the user may see on scoped ticket lists.
   * Admin: null (no filter). Manager: owned. Agent: memberships. EndUser: [].
   */
  async listAccessibleProjectIds(user: AuthUser): Promise<string[] | null> {
    if (user.role === "Admin") return null;

    if (user.role === "Manager") {
      const rows = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.managerId, user.userId));
      return rows.map((r) => r.id);
    }

    if (user.role === "Agent") {
      const rows = await this.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, user.userId));
      return rows.map((r) => r.projectId);
    }

    return [];
  }

  /**
   * SQL filter for ticket `project_id` columns.
   * - Admin: no filter
   * - Manager: owned projects only (null project excluded)
   * - Agent: member projects OR null project (global pool)
   * - EndUser: should use ownership filters instead
   */
  async ticketProjectScope(
    user: AuthUser,
    projectIdColumn: AnyColumn,
  ): Promise<SQL | undefined> {
    if (user.role === "Admin") return undefined;

    const ids = await this.listAccessibleProjectIds(user);

    if (user.role === "Manager") {
      if (!ids || ids.length === 0) return sql`false`;
      return inArray(projectIdColumn, ids);
    }

    if (user.role === "Agent") {
      if (!ids || ids.length === 0) return isNull(projectIdColumn);
      return or(isNull(projectIdColumn), inArray(projectIdColumn, ids));
    }

    return sql`false`;
  }

  async assertCanApprove(
    user: AuthUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (user.role === "Admin") return;

    if (user.role === "Manager") {
      if (!projectId) {
        throw new ForbiddenException(
          "Unscoped tickets (no project) require Admin approval",
        );
      }
      await this.assertCanAccess(user, projectId);
      return;
    }

    throw new ForbiddenException("Admin or Manager role required");
  }

  async assertCanViewTicket(
    user: AuthUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (user.role === "Admin") return;
    if (user.role === "EndUser") return; // caller enforces ownership

    if (!projectId) {
      if (user.role === "Agent") return;
      throw new ForbiddenException("Cannot view this ticket");
    }

    await this.assertCanAccess(user, projectId);
  }

  /**
   * Resolve optional project/module on create. Module must belong to project.
   */
  async resolveProjectModule(input: {
    projectId?: string | null;
    moduleId?: string | null;
  }): Promise<{ projectId: string | null; moduleId: string | null }> {
    const projectId = input.projectId ?? null;
    const moduleId = input.moduleId ?? null;

    if (!projectId && moduleId) {
      throw new BadRequestException("moduleId requires projectId");
    }

    if (projectId) {
      const [project] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) throw new NotFoundException("Project not found");
    }

    if (moduleId && projectId) {
      const [mod] = await this.db
        .select({ id: modules.id, projectId: modules.projectId })
        .from(modules)
        .where(eq(modules.id, moduleId))
        .limit(1);
      if (!mod) throw new NotFoundException("Module not found");
      if (mod.projectId !== projectId) {
        throw new BadRequestException("Module does not belong to project");
      }
    }

    return { projectId, moduleId };
  }

  async assertAgentMember(userId: string): Promise<void> {
    const [user] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.role !== "Agent") {
      throw new BadRequestException("Only Agents can be project members");
    }
  }
}

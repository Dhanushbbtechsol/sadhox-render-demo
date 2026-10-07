import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, isNull, or, SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { modules, projectMembers, projects, users } from "../database/schema";

/**
 * Resource-level project ACL (Phase 6).
 * Guards alone are not enough — every ticket list/get must call these helpers.
 */
@Injectable()
export class ProjectAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Admin always; Manager owns project; Agent is a member. EndUser N/A. */
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

    return false;
  }

  async assertCanAccess(user: AuthUser, projectId: string): Promise<void> {
    const ok = await this.canAccess(user, projectId);
    if (!ok) {
      throw new ForbiddenException("Cannot access this project");
    }
  }

  /**
   * Project IDs the user may see. `null` means Admin (unrestricted).
   * Empty array means no project access (Manager/Agent with no assignments).
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
   * Ticket list filter:
   * - Admin: no filter
   * - Manager: owned projects only (null project excluded)
   * - Agent: member projects OR null project (global pool)
   * - EndUser: callers use ownership filters instead
   */
  async ticketProjectScope(
    user: AuthUser,
    projectIdColumn: AnyPgColumn,
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

  /**
   * Detail / mutate ACL for a ticket's nullable project.
   * EndUser is handled by callers (own-ticket rules).
   * Null project → Admin or Agent (global pool); Manager denied.
   */
  async assertCanAccessTicketProject(
    user: AuthUser,
    projectId: string | null,
  ): Promise<void> {
    await this.assertCanViewTicket(user, projectId);
  }

  /** Manager must own the project; null project → Admin only. */
  async assertCanApprove(
    user: AuthUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (user.role === "Admin") return;
    if (user.role !== "Manager") {
      throw new ForbiddenException("Only Admin or Manager may approve");
    }
    if (projectId == null) {
      throw new ForbiddenException(
        "Unscoped tickets require Admin approval",
      );
    }
    await this.assertCanAccess(user, projectId);
  }

  async assertCanViewTicket(
    user: AuthUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (user.role === "Admin") return;
    if (user.role === "EndUser") return;

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

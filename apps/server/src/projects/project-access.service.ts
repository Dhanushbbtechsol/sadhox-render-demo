import {
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { and, eq, inArray, SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { projectMembers, projects } from "../database/schema";

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
   * Ticket list filter for Agent/Manager:
   * - accessible `project_id`s only
   * - null-project tickets are Admin-only (excluded here)
   * Returns `undefined` for Admin (no extra filter).
   * Returns a never-match filter when the user has zero projects.
   */
  async ticketProjectScope(
    user: AuthUser,
    projectIdColumn: AnyPgColumn,
  ): Promise<SQL | undefined> {
    const ids = await this.listAccessibleProjectIds(user);
    if (ids === null) return undefined;
    if (ids.length === 0) return sql`false`;
    return inArray(projectIdColumn, ids);
  }

  /**
   * Detail / mutate ACL for a ticket's nullable project.
   * EndUser is handled by callers (own-ticket rules).
   * Null project → Admin only.
   */
  async assertCanAccessTicketProject(
    user: AuthUser,
    projectId: string | null,
  ): Promise<void> {
    if (user.role === "EndUser") return;
    if (user.role === "Admin") return;

    if (projectId == null) {
      throw new ForbiddenException(
        "Unscoped tickets (no project) are Admin-only",
      );
    }

    await this.assertCanAccess(user, projectId);
  }

  /** Manager must own the project; null project → Admin only. */
  async assertCanApprove(
    user: AuthUser,
    projectId: string | null,
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

}

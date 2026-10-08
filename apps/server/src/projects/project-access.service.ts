import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { projectMembers, projects } from "../database/schema";

type AccessUser = Pick<AuthUser, "userId" | "role">;

/**
 * Phase 6 AuthZ — design authority Docs/Phase/phase6.md:
 * - Admin → always
 * - Manager → projects.manager_id = user.id
 * - Agent → row in project_members
 * - EndUser → N/A for project lists
 *
 * Reachable product states are single-role. Both data paths are still OR'd
 * as defense-in-depth (e.g. stale membership after Agent→Manager promotion).
 */
@Injectable()
export class ProjectAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async canAccess(
    user: AccessUser,
    projectId: string | null | undefined,
  ): Promise<boolean> {
    if (user.role === "Admin") {
      return true;
    }
    if (projectId == null || projectId === "") {
      return false;
    }
    if (user.role === "EndUser") {
      return false;
    }

    // Path 1 — Manager ownership (projects.manager_id = user.id)
    const [asManager] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.managerId, user.userId)),
      )
      .limit(1);
    if (asManager) {
      return true;
    }

    // Path 2 — membership (project_members). Not gated on role === "Agent"
    // so stale rows after promotion still grant access (documented data-drift).
    const [asMember] = await this.db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.userId),
        ),
      )
      .limit(1);

    return Boolean(asMember);
  }

  async assertCanAccess(
    user: AccessUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (await this.canAccess(user, projectId)) return;
    throw new ForbiddenException("Cannot access this project");
  }

  /**
   * Approval ACL (phase6.md): Admin always; Manager only when
   * projects.manager_id = self; null project_id → Admin-only.
   * Ownership only — membership does not grant approve rights.
   */
  async canApprove(
    user: AccessUser,
    projectId: string | null | undefined,
  ): Promise<boolean> {
    if (user.role === "Admin") return true;
    if (user.role !== "Manager") return false;
    if (projectId == null || projectId === "") return false;

    const [row] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.managerId, user.userId)),
      )
      .limit(1);
    return Boolean(row);
  }

  async assertCanApprove(
    user: AccessUser,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (await this.canApprove(user, projectId)) return;
    if (user.role === "Manager" && (projectId == null || projectId === "")) {
      throw new ForbiddenException(
        "Null-project tickets require Admin approval",
      );
    }
    throw new ForbiddenException(
      "Not allowed to approve for this project",
    );
  }

  /**
   * Phase 8 — Manager-then-Admin when the ticket has a project with a manager.
   * Null project / missing manager → Admin-only single step.
   */
  async projectRequiresManagerStep(
    projectId: string | null | undefined,
  ): Promise<boolean> {
    if (projectId == null || projectId === "") return false;
    const [row] = await this.db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return Boolean(row?.managerId);
  }

  async listAccessibleProjectIds(user: AccessUser): Promise<string[]> {
    if (user.role === "Admin") {
      const rows = await this.db.select({ id: projects.id }).from(projects);
      return rows.map((r) => r.id);
    }
    if (user.role === "EndUser") {
      return [];
    }

    // Union both paths (manager_id + project_members).
    const owned = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.managerId, user.userId));

    const member = await this.db
      .select({ id: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, user.userId));

    return [
      ...new Set([
        ...owned.map((r) => r.id),
        ...member.map((r) => r.id),
      ]),
    ];
  }

  /**
   * Ticket list filter:
   * - Admin: no filter
   * - Manager: accessible projects only (null project excluded)
   * - Agent: accessible projects OR null project (global pool)
   * - EndUser: callers use ownership filters instead
   */
  async ticketProjectScope(
    user: AccessUser,
    projectIdColumn: AnyPgColumn,
  ): Promise<SQL | undefined> {
    if (user.role === "Admin") return undefined;

    const ids = await this.listAccessibleProjectIds(user);

    if (user.role === "Manager") {
      if (ids.length === 0) return sql`false`;
      return inArray(projectIdColumn, ids);
    }

    if (user.role === "Agent") {
      if (ids.length === 0) return isNull(projectIdColumn);
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
    user: AccessUser,
    projectId: string | null,
  ): Promise<void> {
    await this.assertCanViewTicket(user, projectId);
  }

  async assertCanViewTicket(
    user: AccessUser,
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
}

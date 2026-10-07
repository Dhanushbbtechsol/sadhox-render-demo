import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
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
    projectId: string,
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
}

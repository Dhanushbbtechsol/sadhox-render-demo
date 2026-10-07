import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { projectMembers, projects } from "../database/schema";

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

    return false;
  }

  /** Admin → `"all"`; others → concrete project id list (possibly empty). */
  async listAccessibleProjectIds(user: AuthUser): Promise<string[] | "all"> {
    if (user.role === "Admin") return "all";

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
}

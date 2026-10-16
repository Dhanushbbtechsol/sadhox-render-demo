import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { incidents, projectMembers, users } from "../database/schema";
import { ProjectAccessService } from "../projects/project-access.service";

/** Incident statuses that count toward agent load (shown in assignee picker). */
export const OPEN_INCIDENT_STATUSES = [
  "New",
  "Assigned",
  "InProgress",
  "Reopened",
] as const;

const OPEN_STATUSES = OPEN_INCIDENT_STATUSES;

export type AgentSnippet = {
  id: string;
  name: string;
  email: string;
  openTicketCount: number;
};

/**
 * Agent assignment pool for manual incident assignment.
 * Pool = project_members when projectId set; else all Agents (global).
 */
@Injectable()
export class AssignmentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  /**
   * List agents eligible for assignment.
   * When `projectId` is set, pool is that project's members only —
   * caller must canAccess the project (no foreign-pool IDOR).
   */
  async listAgents(
    user: AuthUser,
    projectId?: string | null,
  ): Promise<AgentSnippet[]> {
    if (projectId) {
      await this.projectAccess.assertCanAccess(user, projectId);
    }

    const agentRows = projectId
      ? await this.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(projectMembers)
          .innerJoin(users, eq(projectMembers.userId, users.id))
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(users.role, "Agent"),
            ),
          )
          .orderBy(asc(users.name))
      : await this.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.role, "Agent"))
          .orderBy(asc(users.name));

    if (agentRows.length === 0) return [];

    const loads = await this.db
      .select({
        assignedTo: incidents.assignedTo,
        openCount: count(),
      })
      .from(incidents)
      .where(inArray(incidents.status, [...OPEN_STATUSES]))
      .groupBy(incidents.assignedTo);

    const loadMap = new Map<string, number>();
    for (const row of loads) {
      if (row.assignedTo) loadMap.set(row.assignedTo, Number(row.openCount));
    }

    return agentRows.map((agent) => ({
      ...agent,
      openTicketCount: loadMap.get(agent.id) ?? 0,
    }));
  }

  /** True when agentId is in the assignment pool for the given project (or global). */
  async isInPool(
    agentId: string,
    projectId: string | null,
  ): Promise<boolean> {
    if (projectId) {
      const [row] = await this.db
        .select({ userId: projectMembers.userId })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, agentId),
            eq(users.role, "Agent"),
          ),
        )
        .limit(1);
      return Boolean(row);
    }

    const [row] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, agentId))
      .limit(1);
    return row?.role === "Agent" || row?.role === "Admin";
  }
}

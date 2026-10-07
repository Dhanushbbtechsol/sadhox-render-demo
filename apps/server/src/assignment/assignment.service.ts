import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  incidents,
  problems,
  projectMembers,
  users,
} from "../database/schema";
import { ProjectAccessService } from "../projects/project-access.service";

/** Incident statuses that count toward agent load. */
export const OPEN_INCIDENT_STATUSES = [
  "New",
  "Assigned",
  "InProgress",
] as const;

/** Problem statuses that count toward agent load. */
export const OPEN_PROBLEM_STATUSES = [
  "Open",
  "Investigating",
  "KnownError",
] as const;

const OPEN_STATUSES = OPEN_INCIDENT_STATUSES;

export type AgentSnippet = {
  id: string;
  name: string;
  email: string;
  openTicketCount: number;
};

export type AgentLoad = { agentId: string; openCount: number };

/**
 * Least-loaded agent with deterministic id tie-break (acts as round-robin
 * when loads are equal: assigning bumps that agent so the next pick rotates).
 */
export function pickLeastLoadedAgent(loads: AgentLoad[]): string {
  if (loads.length === 0) {
    throw new ServiceUnavailableException("No agents available for assignment");
  }
  const sorted = [...loads].sort((a, b) => {
    if (a.openCount !== b.openCount) return a.openCount - b.openCount;
    return a.agentId.localeCompare(b.agentId);
  });
  return sorted[0]!.agentId;
}

/** Pure helper — least-loaded pool + sequential cursor (Dev A list API). */
export function pickRoundRobinCandidate<T>(
  candidates: T[],
  cursor: number,
): T {
  if (candidates.length === 0) {
    throw new Error("No candidates");
  }
  return candidates[cursor % candidates.length]!;
}

/**
 * Round-robin / least-loaded agent picker for incident auto-assignment.
 * Pool = project_members when projectId set; else all Agents (global).
 *
 * Phase 6: when the ticket has project_id, the eligible pool is that
 * project's project_members (Agents only). Null project_id → global Agents.
 *
 * Mail is NOT sent here — `IncidentsService.assign` enqueues
 * `sendTicketAssigned` once after the status write (audit A04).
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
   * caller must canAccess the project (no IDOR across foreign pools).
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

  /**
   * Select the least-loaded Agent and claim the ticket (incident) under a
   * transaction + advisory lock so concurrent callers cannot both pick the
   * same agent at the same load.
   *
   * When the incident has a project_id, pool = project_members.
   */
  async assignNextAgent(
    ticketId: string,
    _category?: string,
  ): Promise<AgentSnippet> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('sadhox:assign-next-agent'))`,
      );

      const [ticket] = await tx
        .select({
          id: incidents.id,
          status: incidents.status,
          projectId: incidents.projectId,
        })
        .from(incidents)
        .where(eq(incidents.id, ticketId))
        .limit(1)
        .for("update");

      if (!ticket) {
        throw new NotFoundException("Incident not found");
      }

      const agentRows = ticket.projectId
        ? await tx
            .select({ id: users.id })
            .from(projectMembers)
            .innerJoin(users, eq(projectMembers.userId, users.id))
            .where(
              and(
                eq(projectMembers.projectId, ticket.projectId),
                eq(users.role, "Agent"),
              ),
            )
            .orderBy(users.id)
            .for("update")
        : await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, "Agent"))
            .orderBy(users.id)
            .for("update");

      if (agentRows.length === 0) {
        throw new ServiceUnavailableException(
          ticket.projectId
            ? "No project members available for assignment"
            : "No agents available for assignment",
        );
      }

      const agentIds = agentRows.map((a) => a.id);

      const incidentLoads = await tx
        .select({
          agentId: incidents.assignedTo,
          n: sql<number>`count(*)::int`,
        })
        .from(incidents)
        .where(
          and(
            inArray(incidents.status, [...OPEN_INCIDENT_STATUSES]),
            inArray(incidents.assignedTo, agentIds),
          ),
        )
        .groupBy(incidents.assignedTo);

      const problemLoads = await tx
        .select({
          agentId: problems.assignedTo,
          n: sql<number>`count(*)::int`,
        })
        .from(problems)
        .where(
          and(
            inArray(problems.status, [...OPEN_PROBLEM_STATUSES]),
            inArray(problems.assignedTo, agentIds),
          ),
        )
        .groupBy(problems.assignedTo);

      const loadMap = new Map<string, number>();
      for (const id of agentIds) loadMap.set(id, 0);
      for (const row of incidentLoads) {
        if (row.agentId) {
          loadMap.set(
            row.agentId,
            (loadMap.get(row.agentId) ?? 0) + Number(row.n),
          );
        }
      }
      for (const row of problemLoads) {
        if (row.agentId) {
          loadMap.set(
            row.agentId,
            (loadMap.get(row.agentId) ?? 0) + Number(row.n),
          );
        }
      }

      const loads: AgentLoad[] = agentIds.map((agentId) => ({
        agentId,
        openCount: loadMap.get(agentId) ?? 0,
      }));

      const agentId = pickLeastLoadedAgent(loads);
      const openTicketCount = loadMap.get(agentId) ?? 0;

      const [agent] = await tx
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, agentId))
        .limit(1);

      if (!agent) {
        throw new NotFoundException("No active agents available for assignment");
      }

      const nextStatus =
        ticket.status === "New" || ticket.status === "Assigned"
          ? "Assigned"
          : ticket.status;
      await tx
        .update(incidents)
        .set({
          assignedTo: agentId,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(
          and(eq(incidents.id, ticketId), ne(incidents.status, "Closed")),
        );

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        openTicketCount,
      };
    });
  }
}

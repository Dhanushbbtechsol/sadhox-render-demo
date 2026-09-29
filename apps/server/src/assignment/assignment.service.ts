import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { incidents, problems, users } from "../database/schema";
import { MailService } from "../mail/mail.service";

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
 * Contract used by Dev A `POST /incidents/:id/assign` (`AgentSnippet` return).
 */
@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {}

  async listAgents(): Promise<AgentSnippet[]> {
    const agentRows = await this.db
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

  /**
   * Select the least-loaded Agent and claim the ticket (incident) under a
   * transaction + advisory lock so concurrent callers cannot both pick the
   * same agent at the same load.
   */
  async assignNextAgent(
    ticketId: string,
    _category?: string,
  ): Promise<AgentSnippet> {
    const claimed = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('sadhox:assign-next-agent'))`,
      );

      const agentRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "Agent"))
        .orderBy(users.id)
        .for("update");

      if (agentRows.length === 0) {
        throw new ServiceUnavailableException(
          "No agents available for assignment",
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

      const [incident] = await tx
        .select({
          id: incidents.id,
          status: incidents.status,
          title: incidents.title,
        })
        .from(incidents)
        .where(eq(incidents.id, ticketId))
        .limit(1)
        .for("update");

      if (incident) {
        const nextStatus =
          incident.status === "New" || incident.status === "Assigned"
            ? "Assigned"
            : incident.status;
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
      }

      return {
        agent,
        openTicketCount,
        ticketTitle: incident?.title ?? "Ticket",
      };
    });

    if (claimed.agent.email) {
      try {
        await this.mail.sendTicketAssigned(claimed.agent.email, {
          ticketId,
          ticketTitle: claimed.ticketTitle,
          assigneeName: claimed.agent.name,
        });
      } catch (err) {
        // Assignment already committed — do not roll back on mail enqueue failure.
        this.logger.warn(
          `assignNextAgent mail enqueue failed ticket=${ticketId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return {
      id: claimed.agent.id,
      name: claimed.agent.name,
      email: claimed.agent.email,
      openTicketCount: claimed.openTicketCount,
    };
  }
}

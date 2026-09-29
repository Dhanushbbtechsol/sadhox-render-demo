import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { asc, count, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { incidents, users } from "../database/schema";

export type AgentSnippet = {
  id: string;
  name: string;
  email: string;
  openTicketCount: number;
};

const OPEN_STATUSES = ["New", "Assigned", "InProgress"] as const;

/**
 * Round-robin / least-loaded agent picker for incident auto-assignment.
 * Contract used by Dev A `POST /incidents/:id/assign`.
 */
@Injectable()
export class AssignmentService {
  /** Sequential fallback pointer when loads are equal. */
  private roundRobinCursor = 0;

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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
   * Select the next eligible Agent (least open tickets; round-robin on ties).
   * `ticketId` / `category` reserved for future skill-based routing.
   */
  async assignNextAgent(
    _ticketId: string,
    _category?: string,
  ): Promise<AgentSnippet> {
    const agents = await this.listAgents();
    if (agents.length === 0) {
      throw new NotFoundException("No active agents available for assignment");
    }

    const minLoad = Math.min(...agents.map((a) => a.openTicketCount));
    const candidates = agents.filter((a) => a.openTicketCount === minLoad);

    const picked = pickRoundRobinCandidate(candidates, this.roundRobinCursor);
    this.roundRobinCursor =
      (this.roundRobinCursor + 1) % Number.MAX_SAFE_INTEGER;
    return picked;
  }

  /** Test helper — reset round-robin cursor. */
  resetCursor() {
    this.roundRobinCursor = 0;
  }
}

/** Pure helper — least-loaded pool + sequential cursor. */
export function pickRoundRobinCandidate<T>(
  candidates: T[],
  cursor: number,
): T {
  if (candidates.length === 0) {
    throw new Error("No candidates");
  }
  return candidates[cursor % candidates.length]!;
}

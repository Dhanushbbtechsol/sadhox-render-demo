import type { IncidentStatus } from "../database/schema";

/**
 * ITIL-style incident lifecycle. Illegal jumps (e.g. New → Closed) are rejected.
 *
 * New → Assigned (on agent assignment)
 * Assigned → InProgress
 * InProgress → Resolved (requires resolution notes)
 * Resolved → Closed, or Resolved → Reopened when the reporter reopens it
 * Reopened → InProgress (same path as Assigned after reopen)
 * Closed is terminal
 */
export const INCIDENT_ALLOWED_TRANSITIONS: Record<
  IncidentStatus,
  IncidentStatus[]
> = {
  New: ["Assigned"],
  Assigned: ["InProgress"],
  InProgress: ["Resolved"],
  Resolved: ["Closed", "Reopened"],
  Reopened: ["InProgress"],
  Closed: [],
};

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  if (from === to) return true;
  return (INCIDENT_ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function assertCanTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
): void {
  if (canTransitionIncident(from, to)) return;
  const allowed = INCIDENT_ALLOWED_TRANSITIONS[from] ?? [];
  const hint =
    allowed.length > 0
      ? `Allowed from ${from}: ${allowed.join(", ")}`
      : `${from} is terminal`;
  throw Object.assign(
    new Error(`Invalid status transition ${from} → ${to}. ${hint}`),
    { name: "BadRequestException" },
  );
}

export function requiresResolutionNotes(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return from !== to && to === "Resolved";
}

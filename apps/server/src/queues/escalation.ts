export type EscalationKind = "warning" | "breach";
export type EscalationPriority = "P1" | "P2" | "P3" | "P4";

/**
 * Phase 9 SLA recipient set (user ids).
 * - Assignee always when present.
 * - Manager when the rule says so.
 * - Admin when the rule says so, and always on P1 breach or any unassigned breach.
 */
export function escalationRecipients(input: {
  kind: EscalationKind;
  priority: EscalationPriority;
  assigneeId: string | null;
  managerId: string | null;
  adminIds: string[];
  notifyManager: boolean;
  notifyAdmin: boolean;
}): string[] {
  const ids = new Set<string>();

  if (input.assigneeId) {
    ids.add(input.assigneeId);
  }

  if (input.notifyManager && input.managerId) {
    ids.add(input.managerId);
  }

  const forceAdmin =
    input.kind === "breach" &&
    (input.priority === "P1" || !input.assigneeId);

  if (input.notifyAdmin || forceAdmin) {
    for (const id of input.adminIds) {
      ids.add(id);
    }
  }

  return [...ids];
}

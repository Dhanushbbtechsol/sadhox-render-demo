import type { ImpactUrgency, Priority } from "../database/schema";

/** Phase 2 matrix defaults when sla_rules rows are missing. */
export const DEFAULT_RESOLVE_MINUTES: Record<Priority, number> = {
  P1: 4 * 60,
  P2: 8 * 60,
  P3: 24 * 60,
  P4: 72 * 60,
};

/**
 * Priority matrix (Impact × Urgency):
 * High×High = P1; High×Med / Med×High = P2;
 * Med×Med / Low×High / High×Low = P3; else = P4
 */
export function calculatePriority(
  impact: ImpactUrgency,
  urgency: ImpactUrgency,
): Priority {
  if (impact === "High" && urgency === "High") return "P1";
  if (
    (impact === "High" && urgency === "Medium") ||
    (impact === "Medium" && urgency === "High")
  ) {
    return "P2";
  }
  if (
    (impact === "Medium" && urgency === "Medium") ||
    (impact === "Low" && urgency === "High") ||
    (impact === "High" && urgency === "Low")
  ) {
    return "P3";
  }
  return "P4";
}

export function resolveDueAt(
  priority: Priority,
  from: Date,
  resolveMinutes?: number | null,
): Date {
  const minutes = resolveMinutes ?? DEFAULT_RESOLVE_MINUTES[priority];
  return new Date(from.getTime() + minutes * 60_000);
}

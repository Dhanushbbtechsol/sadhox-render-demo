import type { ImpactUrgency, IncidentStatus, Priority } from "../database/schema";

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

const PRIORITY_RANK: Record<Priority, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };

const CATEGORY_FLOOR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function categoryFloorPriority(openCountIncludingThis: number): Priority | null {
  if (openCountIncludingThis >= 10) return "P1";
  if (openCountIncludingThis >= 5) return "P2";
  if (openCountIncludingThis >= 3) return "P3";
  return null;
}

export function higherPriority(matrix: Priority, floor: Priority | null): Priority {
  if (floor === null) return matrix;
  return PRIORITY_RANK[floor] > PRIORITY_RANK[matrix] ? floor : matrix;
}

export function countsTowardCategoryFloor(
  status: IncidentStatus,
  createdAt: Date,
  now: Date,
): boolean {
  if (status === "Resolved" || status === "Closed") return false;
  return now.getTime() - createdAt.getTime() <= CATEGORY_FLOOR_WINDOW_MS;
}

export function responseMinutesForSeed(
  existing: number | null,
  proposed: number,
): number | null {
  if (existing !== null) return null;
  return proposed;
}

export function resolveDueAt(
  priority: Priority,
  from: Date,
  resolveMinutes?: number | null,
): Date {
  const minutes = resolveMinutes ?? DEFAULT_RESOLVE_MINUTES[priority];
  return new Date(from.getTime() + minutes * 60_000);
}

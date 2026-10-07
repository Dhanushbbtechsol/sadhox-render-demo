import { type Column, type SQL, inArray, isNull, or, sql } from "drizzle-orm";

/**
 * Shared list filter for ticket project_id columns.
 * Admin / EndUser: no project filter (EndUser ownership is applied by caller).
 * Manager: only accessible project ids (no null / global tickets).
 * Agent: accessible project ids OR null project_id (global tickets stay visible).
 */
export function buildTicketProjectListFilter(
  projectIdColumn: Column,
  role: string,
  accessibleIds: string[] | null | undefined,
): SQL | undefined {
  if (role === "Admin" || role === "EndUser") {
    return undefined;
  }

  const ids = accessibleIds ?? [];

  if (role === "Manager") {
    if (ids.length === 0) return sql`false`;
    return inArray(projectIdColumn, ids);
  }

  // Agent (and any other non-Admin staff role using this helper)
  if (ids.length === 0) {
    return isNull(projectIdColumn);
  }
  return or(inArray(projectIdColumn, ids), isNull(projectIdColumn));
}

/**
 * Incident mutate/assign RBAC (Phase 6: Manager included).
 * EndUser remains read/create-own only.
 */
export function canMutateIncident(role: string): boolean {
  return role === "Admin" || role === "Agent" || role === "Manager";
}

export function canLinkProblems(role: string): boolean {
  return role === "Admin" || role === "Agent" || role === "Manager";
}

export function canAssignIncident(role: string): boolean {
  return role === "Admin" || role === "Agent" || role === "Manager";
}

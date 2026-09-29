/**
 * EndUser RBAC expectations for Phase 3 Checkpoint 3.
 * Mirrors Nest @Roles("Admin","Agent") on mutate/assign/problem routes.
 */
export function canMutateIncident(role: string): boolean {
  return role === "Admin" || role === "Agent";
}

export function canLinkProblems(role: string): boolean {
  return role === "Admin" || role === "Agent";
}

export function canAssignIncident(role: string): boolean {
  return role === "Admin" || role === "Agent";
}

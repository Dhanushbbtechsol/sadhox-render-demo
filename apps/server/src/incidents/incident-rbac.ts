/**
 * Incident mutate/assign RBAC.
 * EndUser remains read/create-own only.
 * Only Admin may assign a ticket to another person; Agents may claim (self-assign).
 */
export function canMutateIncident(role: string): boolean {
  return role === "Admin" || role === "Agent" || role === "Manager";
}

export function canLinkProblems(role: string): boolean {
  return role === "Admin" || role === "Agent" || role === "Manager";
}

/** Roles allowed to hit the assign endpoint (Admin assign-others, Agent claim). */
export function canAssignIncident(role: string): boolean {
  return role === "Admin" || role === "Agent";
}

/** Only Admin may assign a ticket to someone else. */
export function canAssignIncidentToOthers(role: string): boolean {
  return role === "Admin";
}

/** Agent may claim (self-assign) a ticket they are eligible for. */
export function canClaimIncident(role: string): boolean {
  return role === "Agent";
}

/**
 * Who may set project/module when raising a ticket.
 * Agents never stamp project — the reporter (or Admin/Manager) does at create.
 */
export function canStampTicketProjectOnCreate(role: string): boolean {
  return role === "Admin" || role === "EndUser" || role === "Manager";
}

/** Who may change project/module after the ticket exists. */
export function canEditTicketProjectScope(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

/**
 * Whether this actor may set assignedTo to targetUserId.
 * Admin → any eligible agent; Agent → only themselves; others → false.
 * Project membership / pool checks happen separately.
 */
export function canSetAssigneeTo(
  role: string,
  actorUserId: string,
  targetUserId: string,
): boolean {
  if (canAssignIncidentToOthers(role)) return true;
  if (canClaimIncident(role) && actorUserId === targetUserId) return true;
  return false;
}

/**
 * @deprecated Prefer canSetAssigneeTo — Admin assigns others; Agents claim self.
 * Kept for call sites that only need "Admin vs not" without a target id.
 */
export function canSetIncidentAssignee(
  role: string,
  _projectId: string | null,
): boolean {
  return canAssignIncidentToOthers(role);
}

/** Reporter only, and only while the ticket is Resolved. Closed stays terminal. */
export function canReopenTicket(
  userId: string,
  reporterId: string,
  status: string,
): boolean {
  return userId === reporterId && status === "Resolved";
}

/** Current project wins so a same-request detach cannot skip the Admin gate. */
export function assigneeProjectId(
  currentProjectId: string | null,
  nextProjectId: string | null,
): string | null {
  if (currentProjectId) return currentProjectId;
  return nextProjectId;
}

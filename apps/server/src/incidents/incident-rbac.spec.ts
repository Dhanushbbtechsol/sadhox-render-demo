import {
  assigneeProjectId,
  canAssignIncident,
  canAssignIncidentToOthers,
  canClaimIncident,
  canEditTicketProjectScope,
  canLinkProblems,
  canMutateIncident,
  canReopenTicket,
  canSetAssigneeTo,
  canSetIncidentAssignee,
  canStampTicketProjectOnCreate,
} from "./incident-rbac";

describe("Incident RBAC helpers", () => {
  it("forbids EndUser from closing incidents", () => {
    expect(canMutateIncident("EndUser")).toBe(false);
    expect(canMutateIncident("Agent")).toBe(true);
    expect(canMutateIncident("Admin")).toBe(true);
    expect(canMutateIncident("Manager")).toBe(true);
  });

  it("lets Admin and Agent hit assign; Manager cannot", () => {
    expect(canAssignIncident("EndUser")).toBe(false);
    expect(canAssignIncident("Agent")).toBe(true);
    expect(canAssignIncident("Admin")).toBe(true);
    expect(canAssignIncident("Manager")).toBe(false);
  });

  it("Agents cannot stamp or edit project scope; reporter/Admin/Manager can stamp", () => {
    expect(canStampTicketProjectOnCreate("EndUser")).toBe(true);
    expect(canStampTicketProjectOnCreate("Admin")).toBe(true);
    expect(canStampTicketProjectOnCreate("Manager")).toBe(true);
    expect(canStampTicketProjectOnCreate("Agent")).toBe(false);
    expect(canEditTicketProjectScope("Admin")).toBe(true);
    expect(canEditTicketProjectScope("Manager")).toBe(true);
    expect(canEditTicketProjectScope("Agent")).toBe(false);
    expect(canEditTicketProjectScope("EndUser")).toBe(false);
  });

  it("only Admin may assign to others; Agent may claim self", () => {
    expect(canAssignIncidentToOthers("Admin")).toBe(true);
    expect(canAssignIncidentToOthers("Agent")).toBe(false);
    expect(canAssignIncidentToOthers("Manager")).toBe(false);
    expect(canClaimIncident("Agent")).toBe(true);
    expect(canClaimIncident("Admin")).toBe(false);

    expect(canSetAssigneeTo("Admin", "admin-1", "agent-2")).toBe(true);
    expect(canSetAssigneeTo("Agent", "agent-1", "agent-1")).toBe(true);
    expect(canSetAssigneeTo("Agent", "agent-1", "agent-2")).toBe(false);
    expect(canSetAssigneeTo("Manager", "mgr-1", "agent-1")).toBe(false);
  });

  it("forbids EndUser from linking problems", () => {
    expect(canLinkProblems("EndUser")).toBe(false);
    expect(canLinkProblems("Agent")).toBe(true);
    expect(canLinkProblems("Manager")).toBe(true);
  });

  it("canSetIncidentAssignee is Admin-only regardless of project", () => {
    expect(canSetIncidentAssignee("Agent", "project-1")).toBe(false);
    expect(canSetIncidentAssignee("Manager", "project-1")).toBe(false);
    expect(canSetIncidentAssignee("Admin", "project-1")).toBe(true);
    expect(canSetIncidentAssignee("Agent", null)).toBe(false);
    expect(canSetIncidentAssignee("Manager", null)).toBe(false);
    expect(canSetIncidentAssignee("Admin", null)).toBe(true);
  });

  it("keeps the current project when an update also clears it", () => {
    expect(assigneeProjectId("project-1", null)).toBe("project-1");
  });

  it("lets only the reporter reopen a resolved ticket", () => {
    expect(canReopenTicket("user-1", "user-1", "Resolved")).toBe(true);
    expect(canReopenTicket("user-2", "user-1", "Resolved")).toBe(false);
    expect(canReopenTicket("user-1", "user-1", "Closed")).toBe(false);
    expect(canReopenTicket("user-1", "user-1", "InProgress")).toBe(false);
  });

  it("uses the destination project when the ticket has none yet", () => {
    expect(assigneeProjectId(null, "project-1")).toBe("project-1");
  });
});

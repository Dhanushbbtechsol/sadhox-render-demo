import {
  assigneeProjectId,
  canAssignIncident,
  canLinkProblems,
  canMutateIncident,
  canReopenTicket,
  canSetIncidentAssignee,
} from "./incident-rbac";

describe("Incident RBAC helpers (Phase 6 Manager)", () => {
  it("forbids EndUser from closing incidents", () => {
    expect(canMutateIncident("EndUser")).toBe(false);
    expect(canMutateIncident("Agent")).toBe(true);
    expect(canMutateIncident("Admin")).toBe(true);
    expect(canMutateIncident("Manager")).toBe(true);
  });

  it("forbids EndUser from assigning incidents", () => {
    expect(canAssignIncident("EndUser")).toBe(false);
    expect(canAssignIncident("Agent")).toBe(true);
    expect(canAssignIncident("Manager")).toBe(true);
  });

  it("forbids EndUser from linking problems", () => {
    expect(canLinkProblems("EndUser")).toBe(false);
    expect(canLinkProblems("Agent")).toBe(true);
    expect(canLinkProblems("Manager")).toBe(true);
  });

  it("lets only an Admin assign a project ticket", () => {
    expect(canSetIncidentAssignee("Agent", "project-1")).toBe(false);
    expect(canSetIncidentAssignee("Manager", "project-1")).toBe(false);
    expect(canSetIncidentAssignee("Admin", "project-1")).toBe(true);
  });

  it("keeps the current pool for a ticket with no project", () => {
    expect(canSetIncidentAssignee("Agent", null)).toBe(true);
    expect(canSetIncidentAssignee("Manager", null)).toBe(true);
    expect(canSetIncidentAssignee("EndUser", null)).toBe(false);
  });

  it("keeps the current project when an update also clears it", () => {
    expect(assigneeProjectId("project-1", null)).toBe("project-1");
    expect(canSetIncidentAssignee("Agent", assigneeProjectId("project-1", null))).toBe(
      false,
    );
  });

  it("lets only the reporter reopen a resolved ticket", () => {
    expect(canReopenTicket("user-1", "user-1", "Resolved")).toBe(true);
    expect(canReopenTicket("user-2", "user-1", "Resolved")).toBe(false);
    expect(canReopenTicket("user-1", "user-1", "Closed")).toBe(false);
    expect(canReopenTicket("user-1", "user-1", "InProgress")).toBe(false);
  });

  it("uses the destination project when the ticket has none yet", () => {
    expect(assigneeProjectId(null, "project-1")).toBe("project-1");
    expect(canSetIncidentAssignee("Agent", assigneeProjectId(null, "project-1"))).toBe(
      false,
    );
  });
});

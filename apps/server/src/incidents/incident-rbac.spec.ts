import {
  canAssignIncident,
  canLinkProblems,
  canMutateIncident,
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
});

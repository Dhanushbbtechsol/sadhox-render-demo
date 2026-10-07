import {
  canAssignIncident,
  canLinkProblems,
  canMutateIncident,
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
});

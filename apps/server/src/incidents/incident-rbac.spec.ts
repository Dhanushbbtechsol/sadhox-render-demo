import {
  canAssignIncident,
  canLinkProblems,
  canMutateIncident,
} from "./incident-rbac";

describe("Phase 3 EndUser RBAC helpers", () => {
  it("forbids EndUser from closing incidents", () => {
    expect(canMutateIncident("EndUser")).toBe(false);
    expect(canMutateIncident("Agent")).toBe(true);
    expect(canMutateIncident("Admin")).toBe(true);
  });

  it("forbids EndUser from assigning incidents", () => {
    expect(canAssignIncident("EndUser")).toBe(false);
    expect(canAssignIncident("Agent")).toBe(true);
  });

  it("forbids EndUser from linking problems", () => {
    expect(canLinkProblems("EndUser")).toBe(false);
    expect(canLinkProblems("Agent")).toBe(true);
  });
});

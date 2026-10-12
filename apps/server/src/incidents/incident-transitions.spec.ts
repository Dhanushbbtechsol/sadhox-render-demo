import {
  assertCanTransitionIncident,
  canTransitionIncident,
  INCIDENT_ALLOWED_TRANSITIONS,
  requiresResolutionNotes,
} from "./incident-transitions";

describe("incident status transitions", () => {
  it("allows the ITIL happy path", () => {
    expect(canTransitionIncident("New", "Assigned")).toBe(true);
    expect(canTransitionIncident("Assigned", "InProgress")).toBe(true);
    expect(canTransitionIncident("InProgress", "Resolved")).toBe(true);
    expect(canTransitionIncident("Resolved", "Closed")).toBe(true);
  });

  it("rejects illegal jumps like New → Closed", () => {
    expect(canTransitionIncident("New", "Closed")).toBe(false);
    expect(canTransitionIncident("New", "Resolved")).toBe(false);
    expect(canTransitionIncident("Assigned", "Closed")).toBe(false);
    expect(canTransitionIncident("Closed", "New")).toBe(false);
    expect(canTransitionIncident("Closed", "Assigned")).toBe(false);
  });

  it("lets a resolved ticket return to Assigned, and keeps Closed terminal", () => {
    expect(canTransitionIncident("Resolved", "Assigned")).toBe(true);
    expect(canTransitionIncident("Resolved", "Closed")).toBe(true);
    expect(INCIDENT_ALLOWED_TRANSITIONS.Closed).toEqual([]);
  });

  it("allows no-op same-status updates", () => {
    expect(canTransitionIncident("InProgress", "InProgress")).toBe(true);
  });

  it("requires resolution notes only when entering Resolved", () => {
    expect(requiresResolutionNotes("InProgress", "Resolved")).toBe(true);
    expect(requiresResolutionNotes("Resolved", "Resolved")).toBe(false);
    expect(requiresResolutionNotes("Resolved", "Closed")).toBe(false);
  });

  it("assertCanTransitionIncident throws on illegal jump", () => {
    expect(() => assertCanTransitionIncident("New", "Closed")).toThrow(
      /Invalid status transition/,
    );
  });

  it("documents the full allowed graph", () => {
    expect(INCIDENT_ALLOWED_TRANSITIONS.New).toEqual(["Assigned"]);
    expect(INCIDENT_ALLOWED_TRANSITIONS.Closed).toEqual([]);
  });
});

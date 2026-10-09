/**
 * Round-robin / least-loaded auto-assignment helpers were removed.
 * Pool + ACL coverage for listAgents lives in assignment.phase6.spec.ts.
 */
import { describe, expect, it } from "vitest";
import { OPEN_INCIDENT_STATUSES } from "./assignment.service";

describe("AssignmentService (manual assign pool)", () => {
  it("exports open incident statuses used for load display", () => {
    expect(OPEN_INCIDENT_STATUSES).toEqual(["New", "Assigned", "InProgress"]);
  });
});

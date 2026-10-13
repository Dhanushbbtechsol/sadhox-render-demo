import { describe, expect, it } from "vitest";

import { formatAuditAction, formatAuditDiff } from "./audit-activity";

describe("formatAuditAction", () => {
  it("maps HTTP paths to plain language (no METHOD /path)", () => {
    expect(
      formatAuditAction({
        action: "PATCH /incidents/6503d4c9-a32b-466e-818c-f389e6ea11e1",
        entityType: "incident",
      }),
    ).toBe("Updated a ticket");

    expect(
      formatAuditAction({
        action: "POST /incidents/6503d4c9-a32b-466e-818c-f389e6ea11e1/assign",
        entityType: "incident",
      }),
    ).toBe("Assigned a ticket");

    expect(
      formatAuditAction({
        action: "POST /problems",
        entityType: "problem",
      }),
    ).toBe("Created an issue");

    expect(
      formatAuditAction({
        action: "POST /problems -> 400",
        entityType: "problem",
      }),
    ).toBe("Created an issue (failed)");
  });

  it("maps system actions without HTTP", () => {
    expect(
      formatAuditAction({
        action: "auth.login_failed",
        entityType: "auth",
      }),
    ).toBe("Someone tried to sign in and failed");
  });
});

describe("formatAuditDiff", () => {
  it("returns [] for null or undefined", () => {
    expect(formatAuditDiff(null)).toEqual([]);
    expect(formatAuditDiff(undefined)).toEqual([]);
  });

  it("formats changed scalar keys from request → response", () => {
    expect(
      formatAuditDiff({
        request: { status: "Submitted", title: "Same" },
        response: { status: "Approved", title: "Same" },
      }),
    ).toEqual(["status: Submitted → Approved"]);
  });

  it("returns [] when request and response match", () => {
    expect(
      formatAuditDiff({
        request: { status: "Submitted" },
        response: { status: "Submitted" },
      }),
    ).toEqual([]);
  });

  it("returns [] for failed or truncated diffs", () => {
    expect(formatAuditDiff({ outcome: "failed", status: 400 })).toEqual([]);
    expect(
      formatAuditDiff({ truncated: true, originalBytes: 9000, maxBytes: 8192 }),
    ).toEqual([]);
  });

  it("formats flat before/after pairs", () => {
    expect(
      formatAuditDiff({
        role: { before: "Agent", after: "Manager" },
      }),
    ).toEqual(["role: Agent → Manager"]);
  });
});

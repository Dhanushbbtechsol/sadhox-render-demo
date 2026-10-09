import { describe, expect, it } from "vitest";

import { formatAuditDiff } from "./audit-activity";

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

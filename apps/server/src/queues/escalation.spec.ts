import { describe, expect, it } from "vitest";
import { escalationRecipients } from "./escalation";

describe("escalationRecipients", () => {
  const base = {
    assigneeId: "agent-1",
    managerId: "mgr-1",
    adminIds: ["admin-1", "admin-2"],
    notifyManager: true,
    notifyAdmin: false,
  } as const;

  it("always includes assignee", () => {
    expect(
      escalationRecipients({
        ...base,
        kind: "warning",
        priority: "P3",
      }),
    ).toEqual(expect.arrayContaining(["agent-1", "mgr-1"]));
  });

  it("P1 breach always includes admins", () => {
    const ids = escalationRecipients({
      ...base,
      kind: "breach",
      priority: "P1",
      notifyAdmin: false,
    });
    expect(ids).toEqual(
      expect.arrayContaining(["agent-1", "mgr-1", "admin-1", "admin-2"]),
    );
  });

  it("unassigned breach always includes admins", () => {
    const ids = escalationRecipients({
      ...base,
      assigneeId: null,
      kind: "breach",
      priority: "P3",
      notifyAdmin: false,
      notifyManager: false,
    });
    expect(ids).toEqual(expect.arrayContaining(["admin-1", "admin-2"]));
    expect(ids).not.toContain("mgr-1");
  });

  it("honors notifyAdmin on warning", () => {
    const ids = escalationRecipients({
      ...base,
      kind: "warning",
      priority: "P2",
      notifyAdmin: true,
      notifyManager: false,
    });
    expect(ids).toEqual(
      expect.arrayContaining(["agent-1", "admin-1", "admin-2"]),
    );
    expect(ids).not.toContain("mgr-1");
  });
});

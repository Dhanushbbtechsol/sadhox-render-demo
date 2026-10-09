import { describe, expect, it } from "vitest";
import { assignmentChanged } from "./asset-assignment";

describe("assignmentChanged", () => {
  it("detects assign, reassign, and unassign", () => {
    expect(assignmentChanged(null, "u1")).toBe(true);
    expect(assignmentChanged("u1", "u2")).toBe(true);
    expect(assignmentChanged("u1", null)).toBe(true);
  });

  it("is false when unchanged", () => {
    expect(assignmentChanged(null, null)).toBe(false);
    expect(assignmentChanged("u1", "u1")).toBe(false);
    expect(assignmentChanged(undefined, null)).toBe(false);
  });
});

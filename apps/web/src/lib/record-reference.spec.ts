import { describe, expect, it } from "vitest";

import { recordReference } from "./record-reference";

describe("recordReference", () => {
  it("shows a present REQ/CHG reference as-is", () => {
    expect(recordReference("REQ-000042")).toBe("REQ-000042");
    expect(recordReference("CHG-000007")).toBe("CHG-000007");
  });

  it("never falls back to a sliced id when the reference is missing", () => {
    const id = "11111111-aaaa-bbbb-cccc-222222222222";
    const sliced = id.slice(0, 8);

    expect(recordReference(null)).not.toBe(sliced);
    expect(recordReference(undefined)).not.toBe(sliced);
    expect(recordReference("")).not.toBe(sliced);
  });

  it("renders the empty-state placeholder for a missing reference", () => {
    expect(recordReference(null)).toBe("—");
  });
});

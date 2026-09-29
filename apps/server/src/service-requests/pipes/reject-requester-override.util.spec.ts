import { describe, expect, it } from "vitest";
import { hasRequesterOverride } from "./reject-requester-override.util";

describe("hasRequesterOverride", () => {
  it("detects client-supplied requesterId/requesterName overrides", () => {
    expect(
      hasRequesterOverride({
        catalogId: "11111111-1111-4111-8111-111111111111",
        requesterId: "user-admin-1",
      }),
    ).toBe(true);
    expect(
      hasRequesterOverride({
        catalogId: "11111111-1111-4111-8111-111111111111",
        requesterName: "Imposter",
      }),
    ).toBe(true);
    expect(
      hasRequesterOverride({
        catalogId: "11111111-1111-4111-8111-111111111111",
        justification: "ok",
        urgency: "High",
        fields: { laptopType: "Developer" },
      }),
    ).toBe(false);
  });
});

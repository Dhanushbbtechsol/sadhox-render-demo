import { describe, expect, it, vi } from "vitest";
import { IncidentCategoriesService } from "./incident-categories.service";

describe("IncidentCategoriesService.assertActivePair", () => {
  it("rejects unknown pairs", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })),
    };
    const svc = new IncidentCategoriesService(db as never);
    await expect(
      svc.assertActivePair("Hardware", "Not A Real Sub"),
    ).rejects.toThrow(/Invalid ticket category/);
  });

  it("returns minPriority for an active pair", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { minPriority: "P1", catActive: true, subActive: true },
        ]),
      })),
    };
    const svc = new IncidentCategoriesService(db as never);
    await expect(
      svc.assertActivePair("Network & Connectivity", "DNS / Firewall"),
    ).resolves.toEqual({ minPriority: "P1" });
  });
});

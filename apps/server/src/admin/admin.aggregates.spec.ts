import { describe, expect, it } from "vitest";
import {
  computeSlaComplianceRate,
  stackOpenClosed,
} from "./chart-range";

/**
 * Day 15 — verify aggregate count composition the same way AdminService
 * composes SQL `count(*) filter (...)` results into chart payloads.
 */
describe("Admin chart aggregate count calculations", () => {
  it("volume-by-module stacked totals equal open + closed per module", () => {
    const modules = [
      { module: "Incident", ...stackOpenClosed(18, 74) },
      { module: "Service Request", ...stackOpenClosed(12, 49) },
      { module: "Change", ...stackOpenClosed(6, 27) },
    ];

    expect(modules.map((m) => m.total)).toEqual([92, 61, 33]);
    expect(modules.reduce((sum, m) => sum + m.total, 0)).toBe(186);
  });

  it("status-distribution sums segment counts to ticket volume", () => {
    const segments = [
      { status: "Incident:New", count: 18 },
      { status: "Incident:InProgress", count: 29 },
      { status: "Incident:Resolved", count: 45 },
      { status: "ServiceRequest:Submitted", count: 14 },
      { status: "Change:Scheduled", count: 8 },
    ];
    const total = segments.reduce((sum, row) => sum + row.count, 0);
    expect(total).toBe(114);
    expect(segments.every((row) => row.count > 0)).toBe(true);
  });

  it("sla-compliance rate matches met/(met+breached) rounding used by API", () => {
    const met = 84;
    const breached = 6;
    const rate = computeSlaComplianceRate(met, breached);
    expect(rate).toBe(93.3);
    expect(met + breached).toBe(90);
  });

  it("dashboard SLA KPI uses same rate helper when samples exist", () => {
    const slaMet = 9;
    const slaTotal = 10;
    const breached = slaTotal - slaMet;
    expect(computeSlaComplianceRate(slaMet, breached)).toBe(90);
  });

  it("empty SLA window reports 100% compliance (no samples)", () => {
    expect(computeSlaComplianceRate(0, 0)).toBe(100);
  });
});

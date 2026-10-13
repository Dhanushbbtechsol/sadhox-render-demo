import { describe, expect, it } from "vitest";
import {
  computeSlaComplianceRate,
  resolveActivityRange,
  resolveChartRange,
  stackOpenClosed,
} from "./chart-range";

describe("resolveChartRange", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");

  it("resolves last 7 days", () => {
    const result = resolveChartRange("7d", now);
    expect(result.range).toBe("7d");
    expect(result.to.toISOString()).toBe(now.toISOString());
    expect(result.from.toISOString()).toBe("2026-09-22T12:00:00.000Z");
  });

  it("resolves last 30 days", () => {
    const result = resolveChartRange("30d", now);
    expect(result.from.toISOString()).toBe("2026-08-30T12:00:00.000Z");
  });

  it("resolves year-to-date from Jan 1 UTC", () => {
    const result = resolveChartRange("ytd", now);
    expect(result.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(result.to.toISOString()).toBe(now.toISOString());
  });

  it("resolves current calendar quarter UTC", () => {
    const result = resolveChartRange("quarter", now);
    expect(result.from.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(result.to.toISOString()).toBe(now.toISOString());
  });

  it("resolves rolling year as last 365 days", () => {
    const result = resolveChartRange("year", now);
    expect(result.from.toISOString()).toBe("2025-09-29T12:00:00.000Z");
    expect(result.to.toISOString()).toBe(now.toISOString());
  });
});

describe("resolveActivityRange", () => {
  const now = new Date("2026-09-29T12:00:00.000Z");

  it("reuses preset windows", () => {
    const result = resolveActivityRange("7d", undefined, undefined, now);
    expect(result.from.toISOString()).toBe("2026-09-22T12:00:00.000Z");
  });

  it("accepts custom date-only bounds as inclusive UTC days", () => {
    const result = resolveActivityRange("custom", "2026-01-01", "2026-01-31");
    expect(result.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });

  it("rejects custom without bounds or inverted range", () => {
    expect(() => resolveActivityRange("custom")).toThrow(/from and to/);
    expect(() =>
      resolveActivityRange("custom", "2026-02-01", "2026-01-01"),
    ).toThrow(/on or before/);
  });
});

describe("computeSlaComplianceRate", () => {
  it("returns 100 when there are no samples", () => {
    expect(computeSlaComplianceRate(0, 0)).toBe(100);
  });

  it("computes rounded percentage from met/breached counts", () => {
    expect(computeSlaComplianceRate(9, 1)).toBe(90);
    expect(computeSlaComplianceRate(84, 6)).toBe(93.3);
  });
});

describe("stackOpenClosed", () => {
  it("sums open and closed for stacked chart totals", () => {
    expect(stackOpenClosed(18, 74)).toEqual({
      open: 18,
      closed: 74,
      total: 92,
    });
  });

  it("coerces invalid values to zero", () => {
    expect(stackOpenClosed(Number.NaN, -3)).toEqual({
      open: 0,
      closed: 0,
      total: 0,
    });
  });
});

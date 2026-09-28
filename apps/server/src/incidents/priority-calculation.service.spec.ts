import {
  calculatePriority,
  DEFAULT_RESOLVE_MINUTES,
  resolveDueAt,
} from "./priority";

describe("calculatePriority", () => {
  it("maps High×High to P1", () => {
    expect(calculatePriority("High", "High")).toBe("P1");
  });

  it("maps High×Medium and Medium×High to P2", () => {
    expect(calculatePriority("High", "Medium")).toBe("P2");
    expect(calculatePriority("Medium", "High")).toBe("P2");
  });

  it("maps Medium×Medium, Low×High, High×Low to P3", () => {
    expect(calculatePriority("Medium", "Medium")).toBe("P3");
    expect(calculatePriority("Low", "High")).toBe("P3");
    expect(calculatePriority("High", "Low")).toBe("P3");
  });

  it("maps remaining combinations to P4", () => {
    expect(calculatePriority("Low", "Low")).toBe("P4");
    expect(calculatePriority("Low", "Medium")).toBe("P4");
    expect(calculatePriority("Medium", "Low")).toBe("P4");
  });
});

describe("resolveDueAt", () => {
  it("computes SLA due from default resolve minutes", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const due = resolveDueAt("P1", from);
    expect(due.toISOString()).toBe("2026-01-01T04:00:00.000Z");
    expect(DEFAULT_RESOLVE_MINUTES.P4).toBe(72 * 60);
  });

  it("prefers sla_rules resolve minutes when provided", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const due = resolveDueAt("P4", from, 100);
    expect(due.toISOString()).toBe("2026-01-01T01:40:00.000Z");
  });
});

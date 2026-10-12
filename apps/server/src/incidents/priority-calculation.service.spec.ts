import {
  calculatePriority,
  categoryFloorPriority,
  countsTowardCategoryFloor,
  DEFAULT_RESOLVE_MINUTES,
  higherPriority,
  resolveDueAt,
  responseMinutesForSeed,
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

describe("category floor", () => {
  const now = new Date("2026-06-08T00:00:00.000Z");

  it("raises a third open Low/Low ticket to P3", () => {
    expect(higherPriority(calculatePriority("Low", "Low"), categoryFloorPriority(3))).toBe("P3");
  });

  it("keeps a lone High/High ticket at P1", () => {
    expect(higherPriority(calculatePriority("High", "High"), categoryFloorPriority(1))).toBe("P1");
  });

  it("raises the eleventh open ticket to P1", () => {
    expect(higherPriority(calculatePriority("Low", "Low"), categoryFloorPriority(11))).toBe("P1");
  });

  it("does not count a closed ticket", () => {
    expect(countsTowardCategoryFloor("Closed", now, now)).toBe(false);
    expect(countsTowardCategoryFloor("Resolved", now, now)).toBe(false);
    expect(countsTowardCategoryFloor("New", now, now)).toBe(true);
  });

  it("keeps High/High at P1 when two other tickets are already open", () => {
    expect(higherPriority(calculatePriority("High", "High"), categoryFloorPriority(3))).toBe("P1");
  });

  it("does not replace a response-minute value that is already set", () => {
    expect(responseMinutesForSeed(30, 15)).toBe(null);
    expect(responseMinutesForSeed(null, 15)).toBe(15);
  });
});

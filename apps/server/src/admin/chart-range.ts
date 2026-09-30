export type ChartRangePreset = "7d" | "30d" | "ytd";

export type ResolvedChartRange = {
  range: ChartRangePreset;
  from: Date;
  to: Date;
};

/** Pure date-window resolver for admin chart queries (unit-tested). */
export function resolveChartRange(
  range: ChartRangePreset,
  now: Date = new Date(),
): ResolvedChartRange {
  const to = new Date(now);
  const from = new Date(now);

  if (range === "7d") {
    from.setUTCDate(from.getUTCDate() - 7);
  } else if (range === "30d") {
    from.setUTCDate(from.getUTCDate() - 30);
  } else {
    from.setUTCMonth(0, 1);
    from.setUTCHours(0, 0, 0, 0);
  }

  return { range, from, to };
}

/** Pure SLA compliance rate helper (unit-tested). */
export function computeSlaComplianceRate(met: number, breached: number): number {
  const total = met + breached;
  if (total === 0) return 100;
  return Math.round((met / total) * 1000) / 10;
}

/** Stack open vs closed counts for volume-by-module chart. */
export function stackOpenClosed(open: number, closed: number) {
  return {
    open: Math.max(0, Number(open) || 0),
    closed: Math.max(0, Number(closed) || 0),
    total: Math.max(0, Number(open) || 0) + Math.max(0, Number(closed) || 0),
  };
}

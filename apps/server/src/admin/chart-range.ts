export const CHART_RANGE_PRESETS = [
  "7d",
  "30d",
  "quarter",
  "ytd",
  "year",
] as const;

export type ChartRangePreset = (typeof CHART_RANGE_PRESETS)[number];

export type ActivityRangePreset = ChartRangePreset | "custom";

export type ResolvedChartRange = {
  range: ChartRangePreset;
  from: Date;
  to: Date;
};

export type ResolvedActivityRange = {
  range: ActivityRangePreset;
  from: Date;
  to: Date;
};

function startOfUtcQuarter(now: Date): Date {
  const month = now.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1, 0, 0, 0, 0),
  );
  return from;
}

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
  } else if (range === "quarter") {
    return { range, from: startOfUtcQuarter(now), to };
  } else if (range === "year") {
    from.setUTCDate(from.getUTCDate() - 365);
  } else {
    // ytd
    from.setUTCMonth(0, 1);
    from.setUTCHours(0, 0, 0, 0);
  }

  return { range, from, to };
}

/**
 * Preset windows reuse {@link resolveChartRange}.
 * `custom` needs both bounds; date-only `to` is treated as end-of-day UTC.
 */
export function resolveActivityRange(
  range: ActivityRangePreset,
  fromIso?: string,
  toIso?: string,
  now: Date = new Date(),
): ResolvedActivityRange {
  if (range !== "custom") {
    const resolved = resolveChartRange(range, now);
    return { range, from: resolved.from, to: resolved.to };
  }

  if (!fromIso || !toIso) {
    throw new Error("custom range requires from and to");
  }

  const from = new Date(fromIso);
  let to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("from and to must be valid dates");
  }

  // Date-only (YYYY-MM-DD) → inclusive end of that UTC day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(toIso)) {
    to = new Date(`${toIso}T23:59:59.999Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromIso)) {
    from.setUTCHours(0, 0, 0, 0);
  }

  if (from > to) {
    throw new Error("from must be on or before to");
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

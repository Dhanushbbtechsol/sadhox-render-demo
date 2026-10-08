/**
 * Server-side dashboard CSV (Phase 8). Mirrors apps/web buildDashboardCsv sections.
 * Web file is not imported — Nest cannot share that module.
 */

export type DashboardReportKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: string;
};

export type DashboardReportCountBucket = {
  label: string;
  count: number;
};

export type DashboardReportSlaWeek = {
  weekStart: string;
  label: string;
  met: number;
  breached: number;
};

export type DashboardReportInput = {
  range: string;
  generatedAt: string;
  kpis: DashboardReportKpi[];
  ticketsByStatus: DashboardReportCountBucket[];
  ticketsByPriority: DashboardReportCountBucket[];
  ticketsByModule: DashboardReportCountBucket[];
  slaCompliance: {
    from: string;
    to: string;
    met: number;
    breached: number;
    rate: number;
  };
  slaPerformance: DashboardReportSlaWeek[];
};

/** Prefix a single quote so spreadsheet apps do not execute formulas. */
export function neutralizeSpreadsheetFormula(value: string): string {
  if (value.length === 0) return value;
  const first = value[0]!;
  if (
    first === "=" ||
    first === "+" ||
    first === "-" ||
    first === "@" ||
    first === "\t" ||
    first === "\r"
  ) {
    return `'${value}`;
  }
  return value;
}

/** RFC 4180 field escaping; formula-neutralise string cells only. */
export function csvEscapeCell(value: string | number): string {
  if (typeof value === "number") {
    return String(value);
  }
  const text = neutralizeSpreadsheetFormula(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function section(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const lines = [
    csvEscapeCell(title),
    headers.map(csvEscapeCell).join(","),
    ...rows.map((row) => row.map(csvEscapeCell).join(",")),
    "",
  ];
  return lines.join("\n");
}

export function buildDashboardReportCsv(input: DashboardReportInput): string {
  const parts = [
    section(
      "Meta",
      ["range", "generatedAt", "slaFrom", "slaTo"],
      [
        [
          input.range,
          input.generatedAt,
          input.slaCompliance.from,
          input.slaCompliance.to,
        ],
      ],
    ),
    section(
      "KPIs",
      ["id", "label", "value", "delta", "trend"],
      input.kpis.map((kpi) => [
        kpi.id,
        kpi.label,
        kpi.value,
        kpi.delta,
        kpi.trend,
      ]),
    ),
    section(
      "Tickets by status",
      ["label", "count"],
      input.ticketsByStatus.map((row) => [row.label, row.count]),
    ),
    section(
      "Tickets by priority",
      ["label", "count"],
      input.ticketsByPriority.map((row) => [row.label, row.count]),
    ),
    section(
      "Tickets by module",
      ["label", "count"],
      input.ticketsByModule.map((row) => [row.label, row.count]),
    ),
    section(
      "SLA compliance (current range)",
      ["met", "breached", "rate"],
      [
        [
          input.slaCompliance.met,
          input.slaCompliance.breached,
          input.slaCompliance.rate,
        ],
      ],
    ),
    section(
      "SLA performance (weekly)",
      ["weekStart", "label", "met", "breached"],
      input.slaPerformance.map((row) => [
        row.weekStart,
        row.label,
        row.met,
        row.breached,
      ]),
    ),
  ];

  return parts.join("\n");
}

export function dashboardReportFilename(range: string, now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `yukti-dashboard-${range}-${date}.csv`;
}

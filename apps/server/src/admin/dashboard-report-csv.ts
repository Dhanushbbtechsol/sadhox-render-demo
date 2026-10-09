/**
 * Admin dashboard report CSV helpers.
 * One flat table per file (header + data rows). UTF-8 BOM + CRLF + RFC 4180.
 */

export const REPORT_TYPES = [
  "summary",
  "all",
  "assigned",
  "in-progress",
  "approved",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_ROW_CAP = 20_000;

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

export type TicketReportRow = {
  id: string;
  module: "Incident" | "Service Request" | "Change";
  title: string;
  status: string;
  priority: string | null;
  category: string | null;
  subcategory: string | null;
  projectName: string | null;
  assignedTo: string | null;
  raisedBy: string | null;
  approvedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  slaDueAt: Date | string | null;
  slaBreached: boolean | null;
  resolvedAt: Date | string | null;
  closedAt: Date | string | null;
  approvedAt: Date | string | null;
  description: string | null;
};

export const SUMMARY_HEADERS = ["Section", "Label", "Value"] as const;

export const TICKET_HEADERS = [
  "Ticket ID",
  "Module",
  "Title / Service",
  "Status",
  "Priority",
  "Category",
  "Subcategory",
  "Project",
  "Assigned To",
  "Raised By",
  "Approved By",
  "Created (UTC)",
  "Last Updated (UTC)",
  "SLA Due (UTC)",
  "SLA Breached",
  "Resolved (UTC)",
  "Closed (UTC)",
  "Approved (UTC)",
  "Description",
] as const;

const MODULE_SORT_ORDER: Record<TicketReportRow["module"], number> = {
  Incident: 0,
  "Service Request": 1,
  Change: 2,
};

const STATUS_LABELS: Record<string, string> = {
  New: "New",
  Assigned: "Assigned",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
  Draft: "Draft",
  Submitted: "Submitted",
  PendingApproval: "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
  InFulfillment: "In Fulfillment",
  Fulfilled: "Fulfilled",
  Scheduled: "Scheduled",
  Implementing: "Implementing",
  Implemented: "Implemented",
  Completed: "Completed",
  Failed: "Failed",
  RolledBack: "Rolled Back",
  Cancelled: "Cancelled",
};

/** Status filters per ticket report type (empty array = skip that module). */
export const REPORT_STATUS_FILTER: Record<
  Exclude<ReportType, "summary" | "all">,
  {
    incidents: string[];
    serviceRequests: string[];
    changes: string[];
  }
> = {
  assigned: {
    incidents: ["Assigned"],
    serviceRequests: [],
    changes: [],
  },
  "in-progress": {
    incidents: ["InProgress"],
    serviceRequests: ["InFulfillment"],
    changes: ["Scheduled", "Implementing"],
  },
  approved: {
    incidents: [],
    serviceRequests: ["Approved"],
    changes: ["Approved"],
  },
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
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  const text = neutralizeSpreadsheetFormula(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatUtcTimestamp(
  value: Date | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function formatBooleanCell(
  value: boolean | null | undefined,
): string {
  if (value == null) return "";
  return value ? "Yes" : "No";
}

export function normalizeDescription(
  value: string | null | undefined,
  maxLen = 1000,
): string {
  if (value == null) return "";
  const collapsed = value.replace(/[\r\n\t]+/g, " ").replace(/ +/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  return collapsed.slice(0, maxLen);
}

function coerceSummaryValue(raw: string): string | number {
  const trimmed = raw.trim();
  const pct = /^(-?\d+(?:\.\d+)?)%$/.exec(trimmed);
  if (pct) {
    return Math.round(Number(pct[1]) * 10) / 10;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

/** One table: header row + data rows, UTF-8 BOM, CRLF. */
export function buildCsvDocument(
  headers: readonly string[],
  rows: Array<Array<string | number>>,
): string {
  const colCount = headers.length;
  const lines: string[] = [headers.map((h) => csvEscapeCell(h)).join(",")];
  for (const row of rows) {
    if (row.length !== colCount) {
      throw new Error(
        `CSV row has ${row.length} columns; expected ${colCount}`,
      );
    }
    lines.push(row.map((cell) => csvEscapeCell(cell)).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** @deprecated Prefer tidy figures CSV via buildTidyFiguresCsvDocument. */
export function buildSummaryReportCsv(input: DashboardReportInput): string {
  const rows: Array<Array<string | number>> = [];

  rows.push(["Meta", "Range", input.range]);
  rows.push(["Meta", "Generated At (UTC)", formatUtcTimestamp(input.generatedAt)]);
  rows.push(["Meta", "SLA From (UTC)", formatUtcTimestamp(input.slaCompliance.from)]);
  rows.push(["Meta", "SLA To (UTC)", formatUtcTimestamp(input.slaCompliance.to)]);

  for (const kpi of input.kpis) {
    rows.push(["KPIs", kpi.label, coerceSummaryValue(kpi.value)]);
  }

  for (const row of input.ticketsByStatus) {
    rows.push(["Tickets by Status", row.label, row.count]);
  }
  for (const row of input.ticketsByPriority) {
    rows.push(["Tickets by Priority", row.label, row.count]);
  }
  for (const row of input.ticketsByModule) {
    rows.push(["Tickets by Module", row.label, row.count]);
  }

  rows.push(["SLA Compliance", "Met", input.slaCompliance.met]);
  rows.push(["SLA Compliance", "Breached", input.slaCompliance.breached]);
  rows.push([
    "SLA Compliance",
    "Rate (%)",
    Math.round(input.slaCompliance.rate * 10) / 10,
  ]);

  for (const week of input.slaPerformance) {
    rows.push(["SLA Performance", `${week.label} — Met`, week.met]);
    rows.push(["SLA Performance", `${week.label} — Breached`, week.breached]);
  }

  return buildCsvDocument(SUMMARY_HEADERS, rows);
}

export const TIDY_CSV_HEADERS = [
  "Section",
  "Module",
  "Metric",
  "Value",
  "Unit",
  "Period Start (UTC)",
  "Period End (UTC)",
] as const;

export function buildTidyFiguresCsvDocument(
  rows: Array<{
    section: string;
    module: string;
    metric: string;
    value: string | number | null;
    unit: string;
    periodStart: string;
    periodEnd: string;
  }>,
): string {
  return buildCsvDocument(
    TIDY_CSV_HEADERS,
    rows.map((r) => [
      r.section,
      r.module,
      r.metric,
      r.value == null ? "" : r.value,
      r.unit,
      r.periodStart,
      r.periodEnd,
    ]),
  );
}

export function sortTicketRows(rows: TicketReportRow[]): TicketReportRow[] {
  return [...rows].sort((a, b) => {
    const mod = MODULE_SORT_ORDER[a.module] - MODULE_SORT_ORDER[b.module];
    if (mod !== 0) return mod;
    const aTime = new Date(a.createdAt ?? 0).getTime();
    const bTime = new Date(b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export function ticketRowToCells(
  row: TicketReportRow,
): Array<string | number> {
  return [
    row.id,
    row.module,
    row.title ?? "",
    formatStatusLabel(row.status),
    row.priority ?? "",
    row.category ?? "",
    row.subcategory ?? "",
    row.projectName ?? "",
    row.assignedTo ?? "",
    row.raisedBy ?? "",
    row.approvedBy ?? "",
    formatUtcTimestamp(row.createdAt),
    formatUtcTimestamp(row.updatedAt),
    formatUtcTimestamp(row.slaDueAt),
    formatBooleanCell(row.slaBreached),
    formatUtcTimestamp(row.resolvedAt),
    formatUtcTimestamp(row.closedAt),
    formatUtcTimestamp(row.approvedAt),
    normalizeDescription(row.description),
  ];
}

export function buildTicketReportCsv(rows: TicketReportRow[]): string {
  const sorted = sortTicketRows(rows);
  return buildCsvDocument(
    TICKET_HEADERS,
    sorted.map((row) => ticketRowToCells(row)),
  );
}

/** @deprecated Prefer buildSummaryReportCsv / buildTicketReportCsv. */
export function buildDashboardReportCsv(input: DashboardReportInput): string {
  return buildSummaryReportCsv(input);
}

export function dashboardReportFilename(
  type: ReportType | string,
  range: string,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  return `yukti-${type}-${range}-${date}.csv`;
}

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

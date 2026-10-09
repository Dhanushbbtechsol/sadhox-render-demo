/**
 * Summary workbook as SpreadsheetML (Excel-native XML, no exceljs).
 * Excel opens .xls SpreadsheetML with multiple worksheets, freeze, autofilter.
 */

import {
  REPORT_STATUS_FILTER,
  TICKET_HEADERS,
  formatBooleanCell,
  formatStatusLabel,
  formatUtcTimestamp,
  neutralizeSpreadsheetFormula,
  normalizeDescription,
  sortTicketRows,
  type TicketReportRow,
} from "./dashboard-report-csv";

export type WorkbookPeriod = {
  range: string;
  from: Date;
  to: Date;
  generatedAt: Date;
};

export type OverviewMetric = {
  metric: string;
  value: string | number | null;
  unit: string;
  definition: string;
};

export type ModuleVolumeRow = {
  module: string;
  open: number;
  closed: number;
  total: number;
};

export type StatusCountRow = {
  module: string;
  status: string;
  count: number;
};

export type PriorityCountRow = {
  priority: string;
  count: number;
};

export type WorkGroupRow = {
  group: string;
  module: string;
  tickets: number;
  statusesIncluded: string;
};

export type SlaComplianceFigures = {
  met: number;
  breached: number;
  rate: number | null;
};

export type SlaWeekRow = {
  weekStart: string;
  label: string;
  met: number;
  breached: number;
};

export type SummaryWorkbookData = {
  period: WorkbookPeriod;
  overview: OverviewMetric[];
  byModule: ModuleVolumeRow[];
  byStatus: StatusCountRow[];
  workGroups: WorkGroupRow[];
  workGroupsNote: string;
  byPriority: PriorityCountRow[];
  slaCompliance: SlaComplianceFigures;
  slaWeeks: SlaWeekRow[];
  tickets: TicketReportRow[];
};

export type TidyFigureRow = {
  section: string;
  module: string;
  metric: string;
  value: string | number | null;
  unit: string;
  periodStart: string;
  periodEnd: string;
};

const WORK_GROUP_LABELS = {
  assigned: "Assigned",
  "in-progress": "In Progress",
  approved: "Approved",
} as const;

export const WORK_GROUPS_NOTE =
  "Work groups are views over statuses and do not add up to Total.";

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textCell(value: string, style?: string): string {
  const safe = xmlEscape(neutralizeSpreadsheetFormula(value));
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  return `<Cell${styleAttr}><Data ss:Type="String">${safe}</Data></Cell>`;
}

function numberCell(value: number, style?: string): string {
  if (!Number.isFinite(value)) {
    return emptyCell(style);
  }
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  return `<Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>`;
}

function emptyCell(style?: string): string {
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  return `<Cell${styleAttr}/>`;
}

function percentCell(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return emptyCell("Percent");
  // Excel percent format expects fraction (0.803 = 80.3%)
  return numberCell(rate / 100, "Percent");
}

function dateTimeCell(value: Date | string | null | undefined): string {
  if (value == null || value === "") return emptyCell("DateTime");
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return emptyCell("DateTime");
  // SpreadsheetML DateTime: 2026-10-09T12:34:56.000
  const iso = date.toISOString().replace("Z", "");
  return `<Cell ss:StyleID="DateTime"><Data ss:Type="DateTime">${iso}</Data></Cell>`;
}

function valueCell(value: string | number | null, unit: string): string {
  if (value == null || value === "") return emptyCell();
  if (typeof value === "number") {
    if (unit === "%") return percentCell(value);
    return numberCell(value);
  }
  return textCell(value);
}

function columnWidths(widths: number[]): string {
  return widths.map((w) => `<Column ss:AutoFitWidth="0" ss:Width="${w}"/>`).join("");
}

function headerRow(headers: readonly string[]): string {
  return `<Row ss:StyleID="Header">${headers.map((h) => textCell(h, "Header")).join("")}</Row>`;
}

function freezeAndFilter(sheetName: string, lastRow: number, lastCol: number): string {
  const range = `R1C1:R${lastRow}C${lastCol}`;
  return `
  <Names>
    <NamedRange ss:Name="_FilterDatabase" ss:RefersTo="=${xmlEscape(sheetName)}!${range}" ss:Hidden="1"/>
  </Names>
  <AutoFilter x:Range="${range}" xmlns="urn:schemas-microsoft-com:office:excel"/>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
    <FreezePanes/>
    <FrozenNoSplit/>
    <SplitHorizontal>1</SplitHorizontal>
    <TopRowBottomPane>1</TopRowBottomPane>
    <ActivePane>2</ActivePane>
  </WorksheetOptions>`;
}

/** Work group rows from REPORT_STATUS_FILTER + ticket counts (do not redefine mapping). */
export function buildWorkGroupRows(
  tickets: TicketReportRow[],
): WorkGroupRow[] {
  const rows: WorkGroupRow[] = [];
  for (const key of ["assigned", "in-progress", "approved"] as const) {
    const filter = REPORT_STATUS_FILTER[key];
    const group = WORK_GROUP_LABELS[key];
    const modules: Array<{
      module: TicketReportRow["module"];
      statuses: string[];
    }> = [
      { module: "Incident", statuses: filter.incidents },
      { module: "Service Request", statuses: filter.serviceRequests },
      { module: "Change", statuses: filter.changes },
    ];
    for (const { module, statuses } of modules) {
      if (statuses.length === 0) continue;
      const statusSet = new Set(statuses);
      const count = tickets.filter(
        (t) => t.module === module && statusSet.has(t.status),
      ).length;
      rows.push({
        group,
        module,
        tickets: count,
        statusesIncluded: statuses.map((s) => formatStatusLabel(s)).join(", "),
      });
    }
  }
  return rows;
}

export function buildTidyFigureRows(data: SummaryWorkbookData): TidyFigureRow[] {
  const start = formatUtcTimestamp(data.period.from);
  const end = formatUtcTimestamp(data.period.to);
  const rows: TidyFigureRow[] = [];

  for (const m of data.overview) {
    rows.push({
      section: "Overview",
      module: "",
      metric: m.metric,
      value: m.value,
      unit: m.unit,
      periodStart: start,
      periodEnd: end,
    });
  }
  for (const m of data.byModule) {
    rows.push({
      section: "By Module",
      module: m.module,
      metric: "Open",
      value: m.open,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
    rows.push({
      section: "By Module",
      module: m.module,
      metric: "Closed",
      value: m.closed,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
    rows.push({
      section: "By Module",
      module: m.module,
      metric: "Total",
      value: m.total,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
  }
  for (const s of data.byStatus) {
    rows.push({
      section: "By Status",
      module: s.module,
      metric: formatStatusLabel(s.status),
      value: s.count,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
  }
  for (const g of data.workGroups) {
    rows.push({
      section: "Work Groups",
      module: g.module,
      metric: g.group,
      value: g.tickets,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
  }
  for (const p of data.byPriority) {
    rows.push({
      section: "By Priority",
      module: "Incident",
      metric: p.priority,
      value: p.count,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
  }
  rows.push({
    section: "SLA",
    module: "Incident",
    metric: "Met",
    value: data.slaCompliance.met,
    unit: "count",
    periodStart: start,
    periodEnd: end,
  });
  rows.push({
    section: "SLA",
    module: "Incident",
    metric: "Breached",
    value: data.slaCompliance.breached,
    unit: "count",
    periodStart: start,
    periodEnd: end,
  });
  rows.push({
    section: "SLA",
    module: "Incident",
    metric: "Rate",
    value: data.slaCompliance.rate,
    unit: "%",
    periodStart: start,
    periodEnd: end,
  });
  for (const w of data.slaWeeks) {
    rows.push({
      section: "SLA Performance",
      module: "Incident",
      metric: `${w.label} — Met`,
      value: w.met,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
    rows.push({
      section: "SLA Performance",
      module: "Incident",
      metric: `${w.label} — Breached`,
      value: w.breached,
      unit: "count",
      periodStart: start,
      periodEnd: end,
    });
  }
  return rows;
}

export const TIDY_FIGURE_HEADERS = [
  "Section",
  "Module",
  "Metric",
  "Value",
  "Unit",
  "Period Start (UTC)",
  "Period End (UTC)",
] as const;

function overviewSheet(data: SummaryWorkbookData): string {
  const headers = ["Metric", "Value", "Unit", "Definition"] as const;
  const body = data.overview
    .map(
      (row) =>
        `<Row>${textCell(row.metric)}${valueCell(row.value, row.unit)}${textCell(row.unit)}${textCell(row.definition)}</Row>`,
    )
    .join("");
  const privacy = `<Row>${textCell("Privacy")}${textCell("Contains staff and requester names. Handle accordingly.")}${emptyCell()}${textCell("Applies to the Tickets sheet")}</Row>`;
  const note = `<Row>${textCell("Work groups")}${textCell(WORK_GROUPS_NOTE)}${emptyCell()}${textCell("See Work Groups sheet")}</Row>`;
  const lastRow = 1 + data.overview.length + 2;
  return `<Worksheet ss:Name="Overview">
  <Table>
    ${columnWidths([160, 100, 60, 360])}
    ${headerRow(headers)}
    ${body}
    ${privacy}
    ${note}
  </Table>
  ${freezeAndFilter("Overview", lastRow, 4)}
</Worksheet>`;
}

function byModuleSheet(data: SummaryWorkbookData): string {
  const headers = ["Module", "Open", "Closed", "Total"] as const;
  const body = data.byModule
    .map(
      (row) =>
        `<Row>${textCell(row.module)}${numberCell(row.open)}${numberCell(row.closed)}${numberCell(row.total)}</Row>`,
    )
    .join("");
  const lastRow = 1 + data.byModule.length;
  return `<Worksheet ss:Name="By Module">
  <Table>
    ${columnWidths([120, 70, 70, 70])}
    ${headerRow(headers)}
    ${body}
  </Table>
  ${freezeAndFilter("By Module", lastRow, 4)}
</Worksheet>`;
}

function byStatusSheet(data: SummaryWorkbookData): string {
  const headers = ["Module", "Status", "Count"] as const;
  const body = data.byStatus
    .map(
      (row) =>
        `<Row>${textCell(row.module)}${textCell(formatStatusLabel(row.status))}${numberCell(row.count)}</Row>`,
    )
    .join("");
  const lastRow = Math.max(1, 1 + data.byStatus.length);
  return `<Worksheet ss:Name="By Status">
  <Table>
    ${columnWidths([120, 140, 70])}
    ${headerRow(headers)}
    ${body}
  </Table>
  ${freezeAndFilter("By Status", lastRow, 3)}
</Worksheet>`;
}

function workGroupsSheet(data: SummaryWorkbookData): string {
  const headers = ["Group", "Module", "Tickets", "Statuses Included"] as const;
  // Note above the filter table (row 1), header at row 2
  const noteRow = `<Row><Cell ss:MergeAcross="3">${textCell(data.workGroupsNote)}</Cell></Row>`;
  const body = data.workGroups
    .map(
      (row) =>
        `<Row>${textCell(row.group)}${textCell(row.module)}${numberCell(row.tickets)}${textCell(row.statusesIncluded)}</Row>`,
    )
    .join("");
  const lastRow = 2 + data.workGroups.length;
  return `<Worksheet ss:Name="Work Groups">
  <Table>
    ${columnWidths([100, 120, 70, 220])}
    ${noteRow}
    ${headerRow(headers)}
    ${body}
  </Table>
  <Names>
    <NamedRange ss:Name="_FilterDatabase" ss:RefersTo="='Work Groups'!R2C1:R${lastRow}C4" ss:Hidden="1"/>
  </Names>
  <AutoFilter x:Range="R2C1:R${lastRow}C4" xmlns="urn:schemas-microsoft-com:office:excel"/>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
    <FreezePanes/>
    <FrozenNoSplit/>
    <SplitHorizontal>2</SplitHorizontal>
    <TopRowBottomPane>2</TopRowBottomPane>
    <ActivePane>2</ActivePane>
  </WorksheetOptions>
</Worksheet>`;
}

function byPrioritySheet(data: SummaryWorkbookData): string {
  const headers = ["Priority", "Count"] as const;
  const body = data.byPriority
    .map(
      (row) =>
        `<Row>${textCell(row.priority)}${numberCell(row.count)}</Row>`,
    )
    .join("");
  const lastRow = Math.max(1, 1 + data.byPriority.length);
  return `<Worksheet ss:Name="By Priority">
  <Table>
    ${columnWidths([80, 70])}
    ${headerRow(headers)}
    ${body}
  </Table>
  ${freezeAndFilter("By Priority", lastRow, 2)}
</Worksheet>`;
}

function slaSheet(data: SummaryWorkbookData): string {
  const headers = ["Section", "Label", "Value", "Unit"] as const;
  const rows: string[] = [];
  rows.push(
    `<Row>${textCell("Compliance")}${textCell("Met")}${numberCell(data.slaCompliance.met)}${textCell("count")}</Row>`,
  );
  rows.push(
    `<Row>${textCell("Compliance")}${textCell("Breached")}${numberCell(data.slaCompliance.breached)}${textCell("count")}</Row>`,
  );
  rows.push(
    `<Row>${textCell("Compliance")}${textCell("Rate")}${percentCell(data.slaCompliance.rate)}${textCell("%")}</Row>`,
  );
  for (const w of data.slaWeeks) {
    rows.push(
      `<Row>${textCell("Weekly")}${textCell(`${w.label} — Met`)}${numberCell(w.met)}${textCell("count")}</Row>`,
    );
    rows.push(
      `<Row>${textCell("Weekly")}${textCell(`${w.label} — Breached`)}${numberCell(w.breached)}${textCell("count")}</Row>`,
    );
  }
  const lastRow = 1 + rows.length;
  return `<Worksheet ss:Name="SLA">
  <Table>
    ${columnWidths([100, 160, 80, 60])}
    ${headerRow(headers)}
    ${rows.join("")}
  </Table>
  ${freezeAndFilter("SLA", lastRow, 4)}
</Worksheet>`;
}

function ticketDataCells(row: TicketReportRow): string {
  return [
    textCell(row.id),
    textCell(row.module),
    textCell(row.title ?? ""),
    textCell(formatStatusLabel(row.status)),
    textCell(row.priority ?? ""),
    textCell(row.category ?? ""),
    textCell(row.subcategory ?? ""),
    textCell(row.projectName ?? ""),
    textCell(row.assignedTo ?? ""),
    textCell(row.raisedBy ?? ""),
    textCell(row.approvedBy ?? ""),
    dateTimeCell(row.createdAt),
    dateTimeCell(row.updatedAt),
    dateTimeCell(row.slaDueAt),
    textCell(formatBooleanCell(row.slaBreached)),
    dateTimeCell(row.resolvedAt),
    dateTimeCell(row.closedAt),
    dateTimeCell(row.approvedAt),
    textCell(normalizeDescription(row.description)),
  ].join("");
}

function ticketsSheet(tickets: TicketReportRow[]): string {
  const sorted = sortTicketRows(tickets);
  // Stream as joined chunks to avoid one giant intermediate array of strings longer than needed
  const parts: string[] = [
    `<Worksheet ss:Name="Tickets">`,
    `<Table>`,
    columnWidths([
      280, 110, 180, 110, 70, 100, 100, 100, 100, 100, 100, 120, 120, 120, 80,
      120, 120, 120, 240,
    ]),
    headerRow(TICKET_HEADERS),
  ];
  for (const row of sorted) {
    parts.push(`<Row>${ticketDataCells(row)}</Row>`);
  }
  const lastRow = 1 + sorted.length;
  parts.push(`</Table>`);
  parts.push(freezeAndFilter("Tickets", Math.max(1, lastRow), TICKET_HEADERS.length));
  parts.push(`</Worksheet>`);
  return parts.join("");
}

export function buildSummaryWorkbookXml(data: SummaryWorkbookData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Percent">
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="DateTime">
   <NumberFormat ss:Format="yyyy-mm-dd hh:mm:ss"/>
  </Style>
 </Styles>
 ${overviewSheet(data)}
 ${byModuleSheet(data)}
 ${byStatusSheet(data)}
 ${workGroupsSheet(data)}
 ${byPrioritySheet(data)}
 ${slaSheet(data)}
 ${ticketsSheet(data.tickets)}
</Workbook>
`;
}

export function summaryWorkbookFilename(
  range: string,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  return `yukti-summary-${range}-${date}.xls`;
}

export function summaryFiguresCsvFilename(
  range: string,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  return `yukti-summary-figures-${range}-${date}.csv`;
}

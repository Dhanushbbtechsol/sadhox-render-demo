import type { TicketReportRow } from "../dashboard-report-csv";
import { formatStatusLabel, normalizeDescription, sortTicketRows } from "../dashboard-report-csv";
import { buildCsvDocument } from "./csv";
import { exportFilename } from "./filename";
import { formatBool, formatCsvDateUtcFull } from "./normalize";
import { buildXlsxBuffer, XLSX_CONTENT_TYPE, type ColumnDef } from "./xlsx";

/** Proposal column order (values unchanged). */
export const TICKET_EXPORT_COLUMNS: ColumnDef[] = [
  { header: "Ticket ID", group: "Identity", text: true, width: 20 },
  { header: "Module", group: "Identity", width: 16 },
  { header: "Title / Service", group: "Identity", width: 40 },
  { header: "Status", group: "Classification", width: 16 },
  { header: "Priority", group: "Classification", width: 10 },
  { header: "Category", group: "Classification", width: 16 },
  { header: "Subcategory", group: "Classification", width: 16 },
  { header: "Project", group: "Classification", width: 20 },
  { header: "Raised By", group: "People", width: 20 },
  { header: "Assigned To", group: "People", width: 20 },
  { header: "Approved By", group: "People", width: 20 },
  { header: "Created", group: "Timeline", date: true, width: 18 },
  { header: "Approved", group: "Timeline", date: true, width: 18 },
  { header: "Resolved", group: "Timeline", date: true, width: 18 },
  { header: "Closed", group: "Timeline", date: true, width: 18 },
  { header: "Last Updated", group: "Timeline", date: true, width: 18 },
  { header: "SLA Due", group: "SLA", date: true, width: 18 },
  { header: "SLA Breached", group: "SLA", width: 12 },
  { header: "Description", group: "Detail", width: 60 },
];

function ticketCsvCells(row: TicketReportRow): Array<string | number> {
  return [
    row.referenceCode || row.id,
    row.module,
    row.title ?? "",
    formatStatusLabel(row.status),
    row.priority ?? "",
    row.category ?? "",
    row.subcategory ?? "",
    row.projectName ?? "",
    row.raisedBy ?? "",
    row.assignedTo ?? "",
    row.approvedBy ?? "",
    formatCsvDateUtcFull(row.createdAt),
    formatCsvDateUtcFull(row.approvedAt),
    formatCsvDateUtcFull(row.resolvedAt),
    formatCsvDateUtcFull(row.closedAt),
    formatCsvDateUtcFull(row.updatedAt),
    formatCsvDateUtcFull(row.slaDueAt),
    formatBool(row.slaBreached),
    normalizeDescription(row.description),
  ];
}

function ticketXlsxCells(
  row: TicketReportRow,
): Array<string | number | Date | null> {
  return [
    row.referenceCode || row.id,
    row.module,
    row.title ?? "",
    formatStatusLabel(row.status),
    row.priority ?? "",
    row.category ?? "",
    row.subcategory ?? "",
    row.projectName ?? "",
    row.raisedBy ?? "",
    row.assignedTo ?? "",
    row.approvedBy ?? "",
    row.createdAt,
    row.approvedAt,
    row.resolvedAt,
    row.closedAt,
    row.updatedAt,
    row.slaDueAt,
    formatBool(row.slaBreached),
    normalizeDescription(row.description),
  ];
}

export function buildTicketExportCsv(rows: TicketReportRow[]): string {
  const sorted = sortTicketRows(rows);
  return buildCsvDocument(
    TICKET_EXPORT_COLUMNS.map((c) => c.header),
    sorted.map(ticketCsvCells),
  );
}

export async function buildTicketExportXlsx(
  rows: TicketReportRow[],
  meta: {
    range: string;
    from: Date;
    to: Date;
    type: string;
    generatedAt?: Date;
  },
): Promise<{ body: Buffer; filename: string; contentType: string }> {
  const sorted = sortTicketRows(rows);
  const generatedAt = meta.generatedAt ?? new Date();
  const body = await buildXlsxBuffer([
    {
      name: "Tickets",
      meta: [
        { label: "Title", value: `Tickets — ${meta.type}` },
        { label: "Scope", value: meta.type },
        { label: "Range", value: meta.range },
        { label: "Generated", value: generatedAt.toISOString() },
        { label: "Timezone", value: "UTC" },
      ],
      columns: TICKET_EXPORT_COLUMNS,
      rows: sorted.map(ticketXlsxCells),
      freezeCols: 3,
    },
  ]);
  return {
    body,
    filename: exportFilename({
      report: `tickets-${meta.type}`,
      scope: "all",
      from: meta.from,
      to: meta.to,
      ext: "xlsx",
      now: generatedAt,
    }),
    contentType: XLSX_CONTENT_TYPE,
  };
}

/** Field multiset for parity (ignores column order). */
export function ticketRecordFields(row: TicketReportRow): Record<string, string> {
  return {
    id: row.referenceCode || row.id,
    module: row.module,
    title: row.title ?? "",
    status: formatStatusLabel(row.status),
    priority: row.priority ?? "",
    category: row.category ?? "",
    subcategory: row.subcategory ?? "",
    project: row.projectName ?? "",
    raisedBy: row.raisedBy ?? "",
    assignedTo: row.assignedTo ?? "",
    approvedBy: row.approvedBy ?? "",
    created: formatCsvDateUtcFull(row.createdAt),
    approved: formatCsvDateUtcFull(row.approvedAt),
    resolved: formatCsvDateUtcFull(row.resolvedAt),
    closed: formatCsvDateUtcFull(row.closedAt),
    updated: formatCsvDateUtcFull(row.updatedAt),
    slaDue: formatCsvDateUtcFull(row.slaDueAt),
    slaBreached: formatBool(row.slaBreached),
    description: normalizeDescription(row.description),
  };
}

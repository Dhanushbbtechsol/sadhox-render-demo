import type { DeskReport } from "../desk-report";
import { buildCsvDocument } from "./csv";
import { EXPORT_FLAGS } from "./flags";
import { exportFilename } from "./filename";
import { buildXlsxBuffer, XLSX_CONTENT_TYPE } from "./xlsx";

const STATUS_ORDER = [
  "New",
  "Assigned",
  "InProgress",
  "In Progress",
  "Resolved",
  "Closed",
  "Draft",
  "Submitted",
  "PendingApproval",
  "Pending Approval",
  "Approved",
  "Rejected",
  "InFulfillment",
  "In Fulfillment",
  "Fulfilled",
  "Scheduled",
  "Implementing",
  "Implemented",
  "Completed",
  "Failed",
  "RolledBack",
  "Rolled Back",
  "Cancelled",
];

const PRIORITY_ORDER = ["P1", "P2", "P3", "P4", "P5"];

function sortByOrder(
  rows: Array<{ key: string; count: number }>,
  order: string[],
): Array<{ key: string; count: number }> {
  return [...rows].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.key.localeCompare(b.key);
  });
}

/** Long-format CSV: Section,Label,Value (proposal Step 2). */
export function buildDeskExportCsv(report: DeskReport): string {
  const rows: Array<Array<string | number>> = [];
  rows.push(["KPI", "Incidents open", report.kpis.incidentsOpen]);
  rows.push(["KPI", "Incidents resolved", report.kpis.incidentsResolved]);
  rows.push(["KPI", "Service requests open", report.kpis.serviceRequestsOpen]);
  rows.push([
    "KPI",
    "Service requests approved",
    report.kpis.serviceRequestsApproved,
  ]);

  for (const row of sortByOrder(
    report.byStatus.map((r) => ({ key: r.status, count: r.count })),
    STATUS_ORDER,
  )) {
    rows.push(["Status", row.key, row.count]);
  }
  for (const row of sortByOrder(
    report.byPriority.map((r) => ({ key: r.priority, count: r.count })),
    PRIORITY_ORDER,
  )) {
    rows.push(["Priority", row.key, row.count]);
  }
  const categories = [...report.byCategory].sort((a, b) => b.count - a.count);
  for (const row of categories) {
    rows.push(["Category", row.category, row.count]);
  }

  rows.push(["SLA", "Met", report.sla.met]);
  rows.push(["SLA", "Breached", report.sla.breached]);
  // Keep numeric rate value; display as percent fraction when rate looks like 0–100.
  const rate =
    report.sla.rate > 1 ? report.sla.rate / 100 : report.sla.rate;
  rows.push(["SLA", "Rate", Math.round(rate * 1000) / 1000]);

  return buildCsvDocument(["Section", "Label", "Value"], rows);
}

export async function buildDeskExportXlsx(
  report: DeskReport,
  bounds: { from: Date; to: Date },
): Promise<{ body: Buffer; filename: string; contentType: string }> {
  const generatedAt = new Date(report.generatedAt);
  const statuses = sortByOrder(
    report.byStatus.map((r) => ({ key: r.status, count: r.count })),
    STATUS_ORDER,
  );
  const priorities = sortByOrder(
    report.byPriority.map((r) => ({ key: r.priority, count: r.count })),
    PRIORITY_ORDER,
  );
  const categories = [...report.byCategory].sort((a, b) => b.count - a.count);

  const rateFraction =
    report.sla.rate > 1 ? report.sla.rate / 100 : report.sla.rate;

  const summaryRows: Array<Array<string | number | null>> = [
    ["KPIs", "", "", ""],
    [
      "Incidents open",
      "Incidents resolved",
      "Service requests open",
      "Service requests approved",
    ],
    [
      report.kpis.incidentsOpen,
      report.kpis.incidentsResolved,
      report.kpis.serviceRequestsOpen,
      report.kpis.serviceRequestsApproved,
    ],
    ["", "", "", ""],
    ["SLA", "", "", ""],
    ["Met", "Breached", "Rate", ""],
    [report.sla.met, report.sla.breached, rateFraction, ""],
  ];

  const maxLen = Math.max(
    statuses.length,
    priorities.length,
    categories.length,
    1,
  );
  const breakdownRows: Array<Array<string | number | null>> = [];
  breakdownRows.push([
    "Status",
    "Count",
    "",
    "Priority",
    "Count",
    "",
    "Category",
    "Count",
  ]);
  for (let i = 0; i < maxLen; i++) {
    breakdownRows.push([
      statuses[i]?.key ?? "",
      statuses[i]?.count ?? "",
      "",
      priorities[i]?.key ?? "",
      priorities[i]?.count ?? "",
      "",
      categories[i]?.category ?? "",
      categories[i]?.count ?? "",
    ]);
  }
  if (EXPORT_FLAGS.derivedTotals) {
    breakdownRows.push([
      "Total",
      statuses.reduce((s, r) => s + r.count, 0),
      "",
      "Total",
      priorities.reduce((s, r) => s + r.count, 0),
      "",
      "Total",
      categories.reduce((s, r) => s + r.count, 0),
    ]);
  }

  const body = await buildXlsxBuffer([
    {
      name: "Summary",
      meta: [
        { label: "Title", value: report.title },
        { label: "Scope", value: report.scope },
        { label: "Range", value: report.range },
        { label: "Generated", value: report.generatedAt },
        { label: "Timezone", value: "UTC" },
      ],
      columns: [
        { header: "A", width: 22 },
        { header: "B", width: 22 },
        { header: "C", width: 22 },
        { header: "D", width: 24 },
      ],
      rows: summaryRows,
    },
    {
      name: "Breakdown",
      meta: [
        { label: "Title", value: report.title },
        { label: "Timezone", value: "UTC" },
      ],
      columns: [
        { header: "Status", width: 18 },
        { header: "Count", width: 10 },
        { header: "", width: 3 },
        { header: "Priority", width: 12 },
        { header: "Count", width: 10 },
        { header: "", width: 3 },
        { header: "Category", width: 20 },
        { header: "Count", width: 10 },
      ],
      rows: breakdownRows,
    },
  ]);

  return {
    body,
    filename: exportFilename({
      report: "desk",
      scope: report.scope,
      from: bounds.from,
      to: bounds.to,
      ext: "xlsx",
      now: generatedAt,
    }),
    contentType: XLSX_CONTENT_TYPE,
  };
}

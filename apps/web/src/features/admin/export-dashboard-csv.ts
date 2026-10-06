import type { AdminStats, ChartRange, SlaComplianceResponse } from "./types";

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function section(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [
    csvEscape(title),
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
    "",
  ];
  return lines.join("\n");
}

export function buildDashboardCsv(args: {
  range: ChartRange;
  stats: AdminStats;
  slaCompliance: SlaComplianceResponse;
}) {
  const { range, stats, slaCompliance } = args;
  const generatedAt = new Date().toISOString();

  const parts = [
    section(
      "Meta",
      ["range", "generatedAt", "slaFrom", "slaTo"],
      [[range, generatedAt, slaCompliance.from, slaCompliance.to]],
    ),
    section(
      "KPIs",
      ["id", "label", "value", "delta", "trend"],
      stats.kpis.map((kpi) => [kpi.id, kpi.label, kpi.value, kpi.delta, kpi.trend]),
    ),
    section(
      "Tickets by status",
      ["label", "count"],
      stats.ticketsByStatus.map((row) => [row.label, row.count]),
    ),
    section(
      "Tickets by priority",
      ["label", "count"],
      stats.ticketsByPriority.map((row) => [row.label, row.count]),
    ),
    section(
      "Tickets by module",
      ["label", "count"],
      stats.ticketsByModule.map((row) => [row.label, row.count]),
    ),
    section(
      "SLA compliance (current range)",
      ["met", "breached", "rate"],
      [[slaCompliance.met, slaCompliance.breached, slaCompliance.rate]],
    ),
    section(
      "SLA performance (weekly)",
      ["weekStart", "label", "met", "breached"],
      stats.slaPerformance.map((row) => [row.weekStart, row.label, row.met, row.breached]),
    ),
  ];

  return parts.join("\n");
}

export function downloadDashboardCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

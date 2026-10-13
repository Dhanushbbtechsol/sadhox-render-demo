import type { ChartRangePreset } from "./chart-range";

export type DeskReportRange = ChartRangePreset;

export type DeskReport = {
  title: string;
  generatedAt: string;
  range: DeskReportRange;
  scope: "All" | "Team";
  kpis: {
    incidentsOpen: number;
    incidentsResolved: number;
    serviceRequestsOpen: number;
    serviceRequestsApproved: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  sla: {
    met: number;
    breached: number;
    rate: number;
  };
};

export function deskReportToCsv(report: DeskReport): string {
  const lines: string[] = [];
  lines.push(`Title,${escapeCsv(report.title)}`);
  lines.push(`Generated,${escapeCsv(report.generatedAt)}`);
  lines.push(`Range,${report.range}`);
  lines.push(`Scope,${report.scope}`);
  lines.push("");
  lines.push("KPIs");
  lines.push("Metric,Value");
  lines.push(`Incidents open,${report.kpis.incidentsOpen}`);
  lines.push(`Incidents resolved,${report.kpis.incidentsResolved}`);
  lines.push(`Service requests open,${report.kpis.serviceRequestsOpen}`);
  lines.push(`Service requests approved,${report.kpis.serviceRequestsApproved}`);
  lines.push("");
  lines.push("By status");
  lines.push("Status,Count");
  for (const row of report.byStatus) {
    lines.push(`${escapeCsv(row.status)},${row.count}`);
  }
  lines.push("");
  lines.push("By priority");
  lines.push("Priority,Count");
  for (const row of report.byPriority) {
    lines.push(`${escapeCsv(row.priority)},${row.count}`);
  }
  lines.push("");
  lines.push("By category");
  lines.push("Category,Count");
  for (const row of report.byCategory) {
    lines.push(`${escapeCsv(row.category)},${row.count}`);
  }
  lines.push("");
  lines.push("SLA");
  lines.push("Met,Breached,Rate");
  lines.push(`${report.sla.met},${report.sla.breached},${report.sla.rate}`);
  return `${lines.join("\n")}\n`;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

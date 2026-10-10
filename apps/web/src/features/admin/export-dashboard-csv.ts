import { apiDownload, apiFetch } from "@/lib/api";

import type { ChartRange, DeskReport } from "./types";

export type DashboardReportType =
  | "all"
  | "assigned"
  | "in-progress"
  | "approved"
  | "open";

export type DashboardReportFormat = "excel" | "csv";

export const DASHBOARD_REPORT_TYPES: {
  value: DashboardReportType;
  format: DashboardReportFormat;
  label: string;
}[] = [
  { value: "all", format: "csv", label: "All tickets" },
  { value: "assigned", format: "csv", label: "Assigned" },
  { value: "in-progress", format: "csv", label: "In progress" },
  { value: "approved", format: "csv", label: "Approved" },
  { value: "open", format: "csv", label: "Open" },
];

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadDashboardReport(
  range: ChartRange,
  type: DashboardReportType,
  format: DashboardReportFormat = "csv",
) {
  const params = new URLSearchParams({
    range,
    type,
    format,
  });
  const { blob, filename } = await apiDownload(
    `/admin/dashboard/report?${params.toString()}`,
  );
  const date = new Date().toISOString().slice(0, 10);
  const fallback = `yukti-${type}-${range}-${date}.csv`;
  downloadBlob(filename ?? fallback, blob);
}

export async function downloadDeskReport(
  range: ChartRange,
  path: "/admin/dashboard/report" | "/manager/reports/desk" = "/admin/dashboard/report",
) {
  const params = new URLSearchParams({ range, format: "csv" });
  const { blob, filename } = await apiDownload(`${path}?${params.toString()}`);
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(filename ?? `desk-report-${range}-${date}.csv`, blob);
}

export async function fetchDeskReport(
  range: ChartRange,
  path: "/admin/dashboard/report" | "/manager/reports/desk" = "/admin/dashboard/report",
): Promise<DeskReport> {
  const params = new URLSearchParams({ range, format: "json" });
  return apiFetch<DeskReport>(`${path}?${params.toString()}`);
}

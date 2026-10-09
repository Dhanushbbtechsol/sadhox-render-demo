import { apiDownload } from "@/lib/api";

import type { ChartRange } from "./types";

export type DashboardReportType =
  | "summary"
  | "all"
  | "assigned"
  | "in-progress"
  | "approved";

export type DashboardReportFormat = "excel" | "csv";

export const DASHBOARD_REPORT_TYPES: {
  value: DashboardReportType;
  format?: DashboardReportFormat;
  label: string;
}[] = [
  { value: "summary", format: "excel", label: "Summary (Excel)" },
  { value: "summary", format: "csv", label: "Summary figures (CSV)" },
  { value: "all", format: "csv", label: "All tickets" },
  { value: "assigned", format: "csv", label: "Assigned" },
  { value: "in-progress", format: "csv", label: "In progress" },
  { value: "approved", format: "csv", label: "Approved" },
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
  type: DashboardReportType = "summary",
  format: DashboardReportFormat = type === "summary" ? "excel" : "csv",
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
  const ext = type === "summary" && format === "excel" ? "xls" : "csv";
  const fallback =
    type === "summary" && format === "csv"
      ? `yukti-summary-figures-${range}-${date}.${ext}`
      : `yukti-${type}-${range}-${date}.${ext}`;
  downloadBlob(filename ?? fallback, blob);
}

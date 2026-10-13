import { apiDownload, apiFetch } from "@/lib/api";

import type { ReportDownloadFormat } from "./report-download";
import type { ChartRange, DeskReport } from "./types";

export type DashboardReportType =
  | "all"
  | "assigned"
  | "in-progress"
  | "approved"
  | "open"
  | "assets";

export type DashboardReportFormat = "excel" | "csv";

export const DASHBOARD_REPORT_TYPES: {
  value: DashboardReportType;
  label: string;
}[] = [
  { value: "all", label: "All tickets" },
  { value: "assigned", label: "Assigned" },
  { value: "in-progress", label: "In progress" },
  { value: "approved", label: "Approved" },
  { value: "open", label: "Open" },
  { value: "assets", label: "Assets" },
];

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Real .xlsx is a ZIP — must start with PK. */
async function assertRealXlsx(blob: Blob): Promise<void> {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4b) return;
  const preview = (await blob.slice(0, 120).text()).replace(/\s+/g, " ");
  throw new Error(
    `Download is not a valid Excel workbook (got “${preview.slice(0, 80)}…” instead of .xlsx). Restart the API and try again.`,
  );
}

function pickFilename(
  filename: string | null,
  fallbackBase: string,
  format: ReportDownloadFormat,
): string {
  // Trust the server name when CORS exposes Content-Disposition.
  // Do not rename .xls→.xlsx (summary still ships SpreadsheetML as .xls).
  const trimmed = filename?.trim();
  if (trimmed) return trimmed;
  return `${fallbackBase}.${format === "excel" ? "xlsx" : "csv"}`;
}

export async function downloadDashboardReport(
  range: ChartRange,
  type: DashboardReportType,
  format: ReportDownloadFormat,
) {
  const date = new Date().toISOString().slice(0, 10);
  const serverFormat: DashboardReportFormat =
    format === "excel" ? "excel" : "csv";
  const params = new URLSearchParams({
    range,
    type,
    format: serverFormat,
  });
  const { blob, filename } = await apiDownload(
    `/admin/dashboard/report?${params.toString()}`,
  );
  if (format === "excel") await assertRealXlsx(blob);
  downloadBlob(
    pickFilename(filename, `yukti-${type}-${range}-${date}`, format),
    blob,
  );
}

export async function downloadDeskReport(
  range: ChartRange,
  path:
    | "/admin/dashboard/report"
    | "/manager/reports/desk" = "/admin/dashboard/report",
  format: ReportDownloadFormat = "csv",
) {
  const date = new Date().toISOString().slice(0, 10);
  const serverFormat = format === "excel" ? "excel" : "csv";
  const params = new URLSearchParams({ range, format: serverFormat });
  const { blob, filename } = await apiDownload(
    `${path}?${params.toString()}`,
  );
  if (format === "excel") await assertRealXlsx(blob);
  downloadBlob(
    pickFilename(filename, `desk-report-${range}-${date}`, format),
    blob,
  );
}

export async function fetchDeskReport(
  range: ChartRange,
  path:
    | "/admin/dashboard/report"
    | "/manager/reports/desk" = "/admin/dashboard/report",
): Promise<DeskReport> {
  const params = new URLSearchParams({ range, format: "json" });
  return apiFetch<DeskReport>(`${path}?${params.toString()}`);
}

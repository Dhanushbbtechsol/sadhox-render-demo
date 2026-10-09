import { apiDownload, apiFetch } from "@/lib/api";

import type { ChartRange, DeskReport } from "./types";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

import { apiDownload } from "@/lib/api";

import type { ChartRange } from "./types";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadDashboardReport(range: ChartRange) {
  const { blob, filename } = await apiDownload(
    `/admin/dashboard/report?range=${range}`,
  );
  const date = new Date().toISOString().slice(0, 10);
  const fallback = `yukti-dashboard-${range}-${date}.csv`;
  downloadBlob(filename ?? fallback, blob);
}

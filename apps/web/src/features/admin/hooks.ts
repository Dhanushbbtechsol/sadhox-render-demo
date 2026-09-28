import { useQuery } from "@tanstack/react-query";

import { mockAdminStats, mockAssets, mockAuditLogs } from "./mocks";
import type { AdminStats, Asset, AuditLog } from "./types";

function loadMock<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250);
  });
}

export function useAssets() {
  return useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: () => loadMock(mockAssets),
  });
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => loadMock(mockAdminStats),
  });
}

export function useAuditLogs() {
  return useQuery<AuditLog[]>({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => loadMock(mockAuditLogs),
  });
}

import type { ChangeRecord } from "@/types/api";

export let mockChanges: ChangeRecord[] = [
  {
    id: "chg-2001",
    title: "Core switch firmware upgrade",
    description: "Upgrade edge switch firmware during maintenance window.",
    type: "Normal",
    status: "Submitted",
    scheduledStart: "2026-09-28T02:00:00.000Z",
    scheduledEnd: "2026-09-28T04:00:00.000Z",
    rollbackPlan: "Re-image previous firmware from golden image and restore configs.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    createdAt: "2026-09-22T11:00:00.000Z",
  },
  {
    id: "chg-2002",
    title: "Emergency firewall rule for partner API",
    description: "Open temporary inbound route for partner integration outage.",
    type: "Emergency",
    status: "Approved",
    scheduledStart: "2026-09-24T16:00:00.000Z",
    scheduledEnd: "2026-09-24T18:00:00.000Z",
    rollbackPlan: "Remove temporary allow rule and restore prior ACL snapshot.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    approvedById: "user-admin",
    createdAt: "2026-09-24T15:20:00.000Z",
  },
];

export function updateMockChangeStatus(
  id: string,
  status: ChangeRecord["status"],
  approverId?: string,
) {
  mockChanges = mockChanges.map((change) =>
    change.id === id
      ? {
          ...change,
          status,
          approvedById: status === "Approved" ? approverId : change.approvedById,
        }
      : change,
  );
  return mockChanges.find((change) => change.id === id);
}

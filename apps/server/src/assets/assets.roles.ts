export const ASSET_ADMIN_ROLES = ["Admin"] as const;

export const OPEN_INCIDENT_STATUSES = ["New", "Assigned", "InProgress"] as const;

export const OPEN_REQUEST_STATUSES = [
  "Submitted",
  "PendingApproval",
  "Approved",
] as const;

export function isOpenIncidentStatus(status: string): boolean {
  return (OPEN_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function isOpenRequestStatus(status: string): boolean {
  return (OPEN_REQUEST_STATUSES as readonly string[]).includes(status);
}

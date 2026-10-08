/**
 * Phase 7 incident category → subcategory map for the web form.
 * Must stay identical to apps/server/src/incidents/incident-category-map.ts
 * (`INCIDENT_CATEGORY_SUBCATEGORY_MAP`) — single server source of truth; this is the UI copy.
 * Keep in sync deliberately.
 */
export const INCIDENT_CATEGORY_MAP = {
  Hardware: [
    "Laptop/Desktop",
    "Mobile Device",
    "Monitor/Peripherals",
    "Printer/Scanner",
  ],
  "Software & OS": [
    "Operating System",
    "Standard Productivity Apps",
    "Enterprise Software (ERP/CRM)",
    "Developer Tools",
  ],
  "Network & Connectivity": [
    "Wi-Fi / LAN",
    "VPN Access",
    "Remote Desktop / VDI",
    "DNS / Firewall",
  ],
  "Identity & Access": [
    "Password Reset",
    "Multi-Factor Authentication (MFA)",
    "Single Sign-On (SSO)",
    "Role Permissions",
  ],
  Collaboration: [
    "Email & Calendar",
    "Messaging (Slack/Teams)",
    "Video Conferencing",
    "File Sharing / Cloud Storage",
  ],
} as const;

export type IncidentCategory = keyof typeof INCIDENT_CATEGORY_MAP;

export const INCIDENT_CATEGORIES = Object.keys(
  INCIDENT_CATEGORY_MAP,
) as IncidentCategory[];

export function subcategoriesFor(
  category: IncidentCategory,
): readonly string[] {
  return INCIDENT_CATEGORY_MAP[category];
}

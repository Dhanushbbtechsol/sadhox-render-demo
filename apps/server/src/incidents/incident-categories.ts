/** Phase 7 incident category → subcategory map (labels only; not a DB table). */
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
  category: string,
): readonly string[] | undefined {
  if (category in INCIDENT_CATEGORY_MAP) {
    return INCIDENT_CATEGORY_MAP[category as IncidentCategory];
  }
  return undefined;
}

export function isValidIncidentCategoryPair(
  category: string,
  subcategory: string,
): boolean {
  const subs = subcategoriesFor(category);
  return Boolean(subs?.includes(subcategory));
}

import type { Priority } from "../database/schema";

/**
 * Seed source for Admin-managed ticket category taxonomy.
 * Runtime validation reads `incident_categories` / `incident_subcategories`.
 * Web falls back to the same names when the taxonomy API is offline.
 */
export const INCIDENT_CATEGORY_SUBCATEGORY_MAP = {
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

/**
 * Demo-friendly minimum priority floors (SLA follows P1–P4 rules).
 * Admin can change these in Categories after seed.
 */
export const SEED_SUBCATEGORY_MIN_PRIORITY: Record<string, Priority> = {
  "Network & Connectivity::DNS / Firewall": "P1",
  "Network & Connectivity::VPN Access": "P2",
  "Software & OS::Enterprise Software (ERP/CRM)": "P2",
  "Hardware::Laptop/Desktop": "P3",
  "Identity & Access::Password Reset": "P3",
};

export type IncidentCategory = keyof typeof INCIDENT_CATEGORY_SUBCATEGORY_MAP;

export const INCIDENT_CATEGORIES = Object.keys(
  INCIDENT_CATEGORY_SUBCATEGORY_MAP,
) as IncidentCategory[];

export function subcategoriesForCategory(
  category: string,
): readonly string[] | undefined {
  if (!(category in INCIDENT_CATEGORY_SUBCATEGORY_MAP)) return undefined;
  return INCIDENT_CATEGORY_SUBCATEGORY_MAP[
    category as IncidentCategory
  ] as readonly string[];
}

export function isValidIncidentCategorySubcategory(
  category: string,
  subcategory: string,
): boolean {
  const subs = subcategoriesForCategory(category);
  return subs !== undefined && (subs as readonly string[]).includes(subcategory);
}

/** Clear message when the effective (category, subcategory) pair is not in the map. */
export function invalidCategorySubcategoryMessage(
  category: string,
  subcategory: string,
): string {
  const subs = subcategoriesForCategory(category);
  if (!subs) {
    return `Invalid incident category "${category}". Choose a category from the Phase 7 map.`;
  }
  return (
    `Subcategory "${subcategory}" is not valid for category "${category}". ` +
    `Choose a subcategory that belongs to that category.`
  );
}

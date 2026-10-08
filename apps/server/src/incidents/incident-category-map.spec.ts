import { describe, expect, it } from "vitest";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_SUBCATEGORY_MAP,
  isValidIncidentCategorySubcategory,
} from "./incident-category-map";

/**
 * Snapshot of the Phase 7 category → subcategory map.
 * Any change must be deliberate and coordinated with Devs A/B (frontend copies).
 */
describe("INCIDENT_CATEGORY_SUBCATEGORY_MAP", () => {
  it("matches the Phase 7 snapshot", () => {
    // Vitest serializes object keys alphabetically in inline snapshots.
    expect(INCIDENT_CATEGORY_SUBCATEGORY_MAP).toMatchInlineSnapshot(`
      {
        "Collaboration": [
          "Email & Calendar",
          "Messaging (Slack/Teams)",
          "Video Conferencing",
          "File Sharing / Cloud Storage",
        ],
        "Hardware": [
          "Laptop/Desktop",
          "Mobile Device",
          "Monitor/Peripherals",
          "Printer/Scanner",
        ],
        "Identity & Access": [
          "Password Reset",
          "Multi-Factor Authentication (MFA)",
          "Single Sign-On (SSO)",
          "Role Permissions",
        ],
        "Network & Connectivity": [
          "Wi-Fi / LAN",
          "VPN Access",
          "Remote Desktop / VDI",
          "DNS / Firewall",
        ],
        "Software & OS": [
          "Operating System",
          "Standard Productivity Apps",
          "Enterprise Software (ERP/CRM)",
          "Developer Tools",
        ],
      }
    `);
  });

  it("does not include Other as a category or subcategory", () => {
    expect(INCIDENT_CATEGORIES).not.toContain("Other");
    for (const subs of Object.values(INCIDENT_CATEGORY_SUBCATEGORY_MAP)) {
      expect(subs).not.toContain("Other");
    }
  });

  it("exposes the five Phase 7 categories in map order", () => {
    expect(INCIDENT_CATEGORIES).toEqual([
      "Hardware",
      "Software & OS",
      "Network & Connectivity",
      "Identity & Access",
      "Collaboration",
    ]);
  });

  it("accepts known pairs and rejects invalid ones", () => {
    expect(
      isValidIncidentCategorySubcategory("Hardware", "Laptop/Desktop"),
    ).toBe(true);
    expect(
      isValidIncidentCategorySubcategory("Hardware", "Password Reset"),
    ).toBe(false);
    expect(
      isValidIncidentCategorySubcategory("Hardware", "Email & Calendar"),
    ).toBe(false);
    expect(isValidIncidentCategorySubcategory("Email", "Other")).toBe(false);
    expect(isValidIncidentCategorySubcategory("Hardware", "Other")).toBe(false);
  });
});

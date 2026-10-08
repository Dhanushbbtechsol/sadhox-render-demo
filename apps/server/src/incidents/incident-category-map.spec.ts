import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_SUBCATEGORY_MAP,
  isValidIncidentCategorySubcategory,
} from "./incident-category-map";

const WEB_CATEGORY_MAP_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../web/src/types/incident-categories.ts",
);

/**
 * Extract a `export const NAME = { ... } as const` object literal as JSON-like data.
 * Used when the web file cannot be imported from the Nest test runner.
 */
function extractExportedConstObject(
  source: string,
  exportName: string,
): Record<string, string[]> {
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Could not find export const ${exportName} in web map file`);
  }
  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) {
    throw new Error(`Could not find object literal for ${exportName}`);
  }
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) {
    throw new Error(`Unbalanced braces for ${exportName}`);
  }
  // TS object literal → JSON: quote unquoted keys, leave string values.
  const literal = source.slice(braceStart, end + 1);
  const jsonish = literal
    .replace(/\/\/[^\n]*/g, "")
    .replace(/,\s*([\]}])/g, "$1")
    .replace(/(^|[{\s,])([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  return JSON.parse(jsonish) as Record<string, string[]>;
}

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

  it("stays in sync with apps/web incident-categories.ts (UI copy)", async () => {
    let webMap: Record<string, readonly string[]>;
    try {
      const mod = await import(
        /* @vite-ignore */ "../../../web/src/types/incident-categories.ts"
      );
      webMap = mod.INCIDENT_CATEGORY_MAP;
    } catch {
      const source = readFileSync(WEB_CATEGORY_MAP_PATH, "utf8");
      webMap = extractExportedConstObject(source, "INCIDENT_CATEGORY_MAP");
    }
    expect(webMap).toEqual(INCIDENT_CATEGORY_SUBCATEGORY_MAP);
  });
});

